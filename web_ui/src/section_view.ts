import { EvaluationValue } from "./evaluation";
import { EvaluationState } from "./evaluation_process";
import { ValueExpression } from "./evaluation_model";

export function evaluateExpression<U extends EvaluationValue>(state: EvaluationState, expr: ValueExpression<U>): U | null {
    switch (expr.type) {
        case "constant":
            return expr.constant;
        case "ref":
            return state.values[expr.ref] as U || null;
    }
}

