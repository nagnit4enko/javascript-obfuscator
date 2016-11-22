import { ICustomNodeWithData } from '../../../interfaces/custom-nodes/ICustomNodeWithData';
import { IStorage } from '../../../interfaces/IStorage';

import { StringArrayEncoding } from '../../../enums/StringArrayEncoding';

import { AbstractReplacer } from './AbstractReplacer';
import { NumberLiteralReplacer } from './NumberLiteralReplacer';
import { Utils } from '../../../Utils';
import { ICustomNodeWithIdentifier } from '../../../interfaces/custom-nodes/ICustomNodeWithIdentifier';

export class StringLiteralReplacer extends AbstractReplacer {
    /**
     * @type {number}
     */
    private static minimumLengthForStringArray: number = 3;

    /**
     * @type {string[]}
     */
    private static rc4Keys: string[] = Utils.getRandomGenerator()
        .n(() => Utils.getRandomGenerator().string({length: 4}), 50);

    /**
     * @param nodeValue
     * @returns {string}
     */
    public replace (nodeValue: string): string {
        const replaceWithStringArrayFlag: boolean = (
            nodeValue.length >= StringLiteralReplacer.minimumLengthForStringArray
            && Utils.getRandomFloat(0, 1) <= this.options.stringArrayThreshold
        );

        if (this.options.stringArray && replaceWithStringArrayFlag) {
            return this.replaceStringLiteralWithStringArrayCall(nodeValue);
        }

        return `'${Utils.stringToUnicodeEscapeSequence(nodeValue)}'`;
    }

    /**
     * @param value
     * @returns {string}
     */
    private replaceStringLiteralWithStringArrayCall (value: string): string {
        const stringArrayNode: ICustomNodeWithData = <ICustomNodeWithData>this.nodes.get('stringArrayNode');

        if (!stringArrayNode) {
            throw new ReferenceError('`stringArrayNode` node is not found in Map with custom node.');
        }

        let rc4Key: string = '';

        switch (this.options.stringArrayEncoding) {
            case StringArrayEncoding.base64:
                value = Utils.btoa(value);

                break;

            case StringArrayEncoding.rc4:
                rc4Key = Utils.getRandomGenerator().pickone(StringLiteralReplacer.rc4Keys);
                value = Utils.btoa(Utils.rc4(value, rc4Key));

                break;
        }

        if (this.options.unicodeEscapeSequence) {
            value = Utils.stringToUnicodeEscapeSequence(value);
        }

        let stringArray: IStorage <string> = stringArrayNode.getNodeData(),
            indexOfExistingValue: number = <number>stringArray.getKeyOf(value),
            indexOfValue: number,
            hexadecimalIndex: string;

        if (indexOfExistingValue >= 0) {
            indexOfValue = indexOfExistingValue;
        } else {
            indexOfValue = stringArray.getLength();
            stringArray.set(null, value);
        }

        hexadecimalIndex = new NumberLiteralReplacer(this.nodes, this.options)
            .replace(indexOfValue);

        const stringArrayCallsWrapper: ICustomNodeWithIdentifier = <ICustomNodeWithIdentifier>this.nodes.get('stringArrayCallsWrapper');

        if (!stringArrayCallsWrapper) {
            throw new ReferenceError('`stringArrayCallsWrapper` node is not found in Map with custom node.');
        }

        if (this.options.stringArrayEncoding === StringArrayEncoding.rc4) {
            return `${stringArrayCallsWrapper.getNodeIdentifier()}('${hexadecimalIndex}', '${Utils.stringToUnicodeEscapeSequence(rc4Key)}')`;
        }

        return `${stringArrayCallsWrapper.getNodeIdentifier()}('${hexadecimalIndex}')`;
    }
}