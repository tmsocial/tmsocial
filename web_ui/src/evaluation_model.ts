import { EvaluationValue, Score, Fraction, TimeUsage, MemoryUsage, Status } from "./evaluation";

export interface ValueReference {
    type: "ref";
    ref: string;
}

export interface ConstantValue<T extends EvaluationValue> {
    type: "constant";
    constant: T;
}

export type ValueExpression<T extends EvaluationValue> = ConstantValue<T> | ValueReference

