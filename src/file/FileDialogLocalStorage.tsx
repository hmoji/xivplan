import {
    Button,
    DataGrid,
    DataGridBody,
    DataGridCell,
    DataGridCellFocusMode,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridProps,
    DataGridRow,
    DialogActions,
    DialogTrigger,
    Field,
    Input,
    TableColumnDefinition,
    TableColumnId,
    TableRowId,
    Tooltip,
    createTableColumn,
    makeStyles,
} from '@fluentui/react-components';
import { DeleteFilled, DeleteRegular, bundleIcon } from '@fluentui/react-icons';
import { t } from 'i18next';
import React, { KeyboardEvent, MouseEvent, useCallback, useMemo, useState } from 'react';
import { HtmlPortalNode, InPortal } from 'react-reverse-portal';
import { useAsync, useAsyncFn, useCounter } from 'react-use';
import { FileSource, useLoadScene, useScene, useSetSource } from '../SceneProvider';
import { openFile, saveFile } from '../file';
import { useCloseDialog } from '../useCloseDialog';
import { useIsDirty, useSetSavedState } from '../useIsDirty';
import { DownloadLocalStorageButton } from './DownloadLocalStorageButton';
import { useConfirmDeleteFile, useConfirmOverwriteFile, useConfirmUnsavedChanges } from './confirm';
import { LocalStorageFileInfo, deleteFileLocalStorage, listLocalStorageFiles } from './localStorage';

const getCellFocusMode = (columnId: TableColumnId): DataGridCellFocusMode => {
    switch (columnId) {
        case 'delete':
            return 'none';
        default:
            return 'cell';
    }
};

const DeleteIcon = bundleIcon(DeleteFilled, DeleteRegular);

export interface OpenLocalStorageProps {
    actions: HtmlPortalNode;
}

export const OpenLocalStorage: React.FC<OpenLocalStorageProps> = ({ actions }) => {
    const classes = useStyles();
    const isDirty = useIsDirty();
    const loadScene = useLoadScene();
    const dismissDialog = useCloseDialog();

    const [confirmUnsavedChanges, renderModal1] = useConfirmUnsavedChanges();
    const [confirmDeleteFile, renderModal2] = useConfirmDeleteFile();

    const [selectedRows, setSelectedRows] = useState(new Set<TableRowId>());
    const onSelectionChange: DataGridProps['onSelectionChange'] = (ev, data) => {
        setSelectedRows(data.selectedItems);
    };

    const [counter, { inc: reloadFiles }] = useCounter();
    const files = useAsync(listLocalStorageFiles, [counter]);

    const loadSceneFromStorage = useCallback(
        async (event: MouseEvent<HTMLElement>, name: string) => {
            if (isDirty && !(await confirmUnsavedChanges())) {
                return;
            }

            const source: FileSource = { type: 'local', name };
            const scene = await openFile(source);

            loadScene(scene, source);
            dismissDialog();
        },
        [isDirty, loadScene, dismissDialog, confirmUnsavedChanges],
    );

    const openCallback = useCallback(
        async (event: MouseEvent<HTMLElement>) => {
            const [name] = selectedRows;
            if (name) {
                await loadSceneFromStorage(event, name as string);
            }
        },
        [selectedRows, loadSceneFromStorage],
    );

    const deleteFile = useCallback(
        async (item: LocalStorageFileInfo) => {
            if (await confirmDeleteFile(item.name)) {
                await deleteFileLocalStorage(item.name);
                reloadFiles();
            }
        },
        [reloadFiles, confirmDeleteFile],
    );

    const columns = useMemo<TableColumnDefinition<LocalStorageFileInfo>[]>(
        () => [
            createTableColumn<LocalStorageFileInfo>({
                columnId: 'name',
                compare: (a, b) => a.name.localeCompare(b.name),
                renderHeaderCell: () => 'Name',
                renderCell: (item) => item.name,
            }),
            createTableColumn<LocalStorageFileInfo>({
                columnId: 'lastUpdate',
                compare: (a, b) => {
                    const time1 = a.lastEdited?.getTime() ?? 0;
                    const time2 = b.lastEdited?.getTime() ?? 0;
                    return time1 - time2;
                },
                renderHeaderCell: () => 'Last updated',
                renderCell: (item) => item.lastEdited?.toLocaleString(),
            }),
            createTableColumn<LocalStorageFileInfo>({
                columnId: 'delete',
                renderHeaderCell: () => 'Actions',
                renderCell: (item) => {
                    return (
                        <>
                            <Tooltip
                                content={`Delete ${item.name}`}
                                appearance="inverted"
                                relationship="label"
                                withArrow
                            >
                                <Button
                                    appearance="subtle"
                                    aria-label="Delete"
                                    icon={<DeleteIcon />}
                                    onClick={() => deleteFile(item)}
                                />
                            </Tooltip>
                        </>
                    );
                },
            }),
        ],
        [deleteFile],
    );

    // TODO: virtualize datagrid?
    // https://react.fluentui.dev/?path=/docs/components-datagrid--default#virtualization
    return (
        <>
            <DataGrid
                items={files.value ?? []}
                columns={columns}
                getRowId={(item: LocalStorageFileInfo) => item.name}
                size="small"
                selectionMode="single"
                selectedItems={selectedRows}
                onSelectionChange={onSelectionChange}
                subtleSelection
                sortable
            >
                <DataGridHeader>
                    <DataGridRow>
                        {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
                    </DataGridRow>
                </DataGridHeader>
                <DataGridBody<LocalStorageFileInfo> className={classes.fileList}>
                    {({ item, rowId }) => (
                        <DataGridRow<LocalStorageFileInfo>
                            key={rowId}
                            selectionCell={{ radioIndicator: { 'aria-label': 'Select row' } }}
                            onDoubleClick={(ev: MouseEvent<HTMLElement>) => loadSceneFromStorage(ev, rowId as string)}
                        >
                            {({ renderCell, columnId }) => (
                                <DataGridCell focusMode={getCellFocusMode(columnId)}>{renderCell(item)}</DataGridCell>
                            )}
                        </DataGridRow>
                    )}
                </DataGridBody>
            </DataGrid>

            {renderModal1()}
            {renderModal2()}

            <InPortal node={actions}>
                <DialogActions fluid className={classes.actions}>
                    <DownloadLocalStorageButton />
                    <Button appearance="primary" disabled={selectedRows.size === 0} onClick={openCallback}>
                        {t('FileDialogLocalStorage.Open')}
                    </Button>
                    <DialogTrigger>
                        <Button>{t('FileDialogLocalStorage.Cancel')}</Button>
                    </DialogTrigger>
                </DialogActions>
            </InPortal>
        </>
    );
};

function getInitialName(source: FileSource | undefined) {
    return source?.type === 'local' ? source.name : '';
}

export interface SaveLocalStorageProps {
    actions: HtmlPortalNode;
}

export const SaveLocalStorage: React.FC<SaveLocalStorageProps> = ({ actions }) => {
    const setSavedState = useSetSavedState();
    const dismissDialog = useCloseDialog();
    const files = useAsync(listLocalStorageFiles);

    const setSource = useSetSource();
    const { scene, source } = useScene();
    const [name, setName] = useState(getInitialName(source));
    const [confirmOverwriteFile, renderModal] = useConfirmOverwriteFile();

    const alreadyExists = useMemo(() => files.value?.some((f) => f.name === name?.trim()), [files.value, name]);
    const canSave = !!name?.trim() && !files.loading;

    const [, save] = useAsyncFn(async () => {
        if (!canSave) {
            return;
        }

        const source: FileSource = { type: 'local', name: name.trim() };

        if (alreadyExists && !(await confirmOverwriteFile(source.name))) {
            return;
        }

        await saveFile(scene, source);

        setSource(source);
        setSavedState(scene);
        dismissDialog();
    }, [scene, name, canSave, alreadyExists, dismissDialog, setSavedState, setSource, confirmOverwriteFile]);

    const onKeyUp = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                save();
            }
        },
        [save],
    );

    return (
        <>
            <Field
                label={t('FileDialogLocalStorage.FileName')}
                validationState={alreadyExists ? 'error' : 'none'}
                validationMessage={alreadyExists ? t('FileDialogLocalStorage.FileExists') : undefined}
            >
                <Input
                    type="text"
                    autoFocus
                    value={name}
                    onChange={(ev, data) => setName(data.value)}
                    onKeyUp={onKeyUp}
                />
            </Field>

            {renderModal()}

            <InPortal node={actions}>
                <DialogActions>
                    <Button appearance="primary" disabled={!canSave} onClick={save}>
                        {t('FileDialogLocalStorage.SaveAs')}
                    </Button>
                    <DialogTrigger>
                        <Button>{t('FileDialogLocalStorage.Cancel')}</Button>
                    </DialogTrigger>
                </DialogActions>
            </InPortal>
        </>
    );
};

const useStyles = makeStyles({
    fileList: {
        height: '40vh',
        overflowY: 'auto',
    },

    actions: {
        width: '100%',
    },
});
