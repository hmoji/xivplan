import { Field } from '@fluentui/react-components';
import React from 'react';
import { useScene } from '../../SceneProvider';
import { SpinButtonUnits } from '../../SpinButtonUnits';
import { useSpinChanged } from '../../prefabs/useSpinChanged';
import { EnemyObject, EnemyRingStyle, RotateableObject, isEnemy } from '../../scene';
import { useControlStyles } from '../../useControlStyles';
import { commonValue } from '../../util';
import { PropertiesControlProps } from '../PropertiesControl';

export const RotationControl: React.FC<PropertiesControlProps<RotateableObject | EnemyObject>> = ({ objects }) => {
    const classes = useControlStyles();
    const { dispatch } = useScene();

    const rotation = commonValue(objects, (obj) => obj.rotation);
    const noDirection = commonValue(objects, (obj) => isEnemy(obj) && obj.ring == EnemyRingStyle.NoDirection);

    const onRotationChanged = useSpinChanged((rotation: number) =>
        dispatch({ type: 'update', value: objects.map((obj) => ({ ...obj, rotation })) }),
    );

    return (
        <Field label="Rotation" className={classes.cell}>
            <SpinButtonUnits
                disabled={noDirection}
                value={rotation}
                onChange={onRotationChanged}
                step={5}
                fractionDigits={1}
                suffix="°"
            />
        </Field>
    );
};
