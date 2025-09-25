import {
    Button,
    DialogActions,
    DialogTrigger,
    Field,
    Textarea,
    TextareaOnChangeData,
} from '@fluentui/react-components';
import React, { ChangeEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HtmlPortalNode, InPortal } from 'react-reverse-portal';
import { useLoadScene } from '../SceneProvider';
import { textToScene } from '../file';
import { Scene } from '../scene';
import { useCloseDialog } from '../useCloseDialog';
import { useIsDirty } from '../useIsDirty';
import { useConfirmUnsavedChanges } from './confirm';
import { parseSceneLink } from './share';

export interface ImportFromStringProps {
    actions: HtmlPortalNode;
}

export const ImportFromString: React.FC<ImportFromStringProps> = ({ actions }) => {
    const isDirty = useIsDirty();
    const loadScene = useLoadScene();
    const dismissDialog = useCloseDialog();

    const [confirmUnsavedChanges, renderModal] = useConfirmUnsavedChanges();
    const [data, setData] = useState<string | undefined>('');
    const [error, setError] = useState<string | undefined>('');

    const importLink = useCallback(async () => {
        if (!data) {
            return;
        }

        if (isDirty) {
            if (!(await confirmUnsavedChanges())) {
                return;
            }
        }

        const scene = decodeScene(data);
        if (!scene) {
            setError('Invalid link');
            return;
        }

        loadScene(scene);
        dismissDialog();
    }, [data, isDirty, loadScene, dismissDialog, confirmUnsavedChanges]);

    const onChange = useCallback(
        (ev: ChangeEvent<HTMLTextAreaElement>, data: TextareaOnChangeData) => {
            setData(data.value);
            setError(undefined);
        },
        [setError, setData],
    );

    const onKeyUp = useCallback(
        (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                importLink();
            }
        },
        [importLink],
    );
    const { t } = useTranslation();

    return (
        <>
            <Field label="Enter plan link" validationState={error ? 'error' : 'none'} validationMessage={error}>
                <Textarea rows={4} onChange={onChange} onKeyUp={onKeyUp} />
            </Field>

            {renderModal()}

            <InPortal node={actions}>
                <DialogActions>
                    <Button appearance="primary" disabled={!data} onClick={importLink}>
                        {t('FileDialogShare.Import')}
                    </Button>
                    <DialogTrigger>
                        <Button>{t('FileDialogShare.Cancel')}</Button>
                    </DialogTrigger>
                </DialogActions>
            </InPortal>
        </>
    );
};

function decodeScene(text: string): Scene | undefined {
    try {
        return parseSceneLink(new URL(text));
    } catch (ex) {
        if (!(ex instanceof TypeError)) {
            console.error('Invalid plan data', ex);
            return undefined;
        }
    }

    // Not a URL. Try as plain data.
    try {
        return textToScene(decodeURIComponent(text));
    } catch (ex) {
        console.error('Invalid plan data', ex);
    }

    return undefined;
}
