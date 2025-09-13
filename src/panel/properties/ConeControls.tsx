import { Field } from '@fluentui/react-components';
import React from 'react';
import { useScene } from '../../SceneProvider';
import { SpinButtonUnits } from '../../SpinButtonUnits';
import { MAX_CONE_ANGLE, MIN_CONE_ANGLE } from '../../prefabs/bounds';
import { useSpinChanged } from '../../prefabs/useSpinChanged';
import { ArcZone, ConeZone } from '../../scene';
import { useControlStyles } from '../../useControlStyles';
import { commonValue } from '../../util';
import { PropertiesControlProps } from '../PropertiesControl';

export const ConeAngleControl: React.FC<PropertiesControlProps<ArcZone | ConeZone>> = ({ objects }) => {
    const classes = useControlStyles();
    const { dispatch } = useScene();

    const coneAngle = commonValue(objects, (obj) => obj.coneAngle);

    const onAngleChanged = useSpinChanged((coneAngle: number) =>
        dispatch({ type: 'update', value: objects.map((obj) => ({ ...obj, coneAngle })) }),
    );

    return (
        <Field label="Angle" className={classes.cell}>
            <SpinButtonUnits
                value={coneAngle}
                onChange={onAngleChanged}
                min={MIN_CONE_ANGLE}
                max={MAX_CONE_ANGLE}
                step={5}
                fractionDigits={1}
                suffix="°"
            />
        </Field>
    );
};
