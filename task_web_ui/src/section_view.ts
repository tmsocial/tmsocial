import { EvaluationValue } from "./evaluation";
import { EvaluationSummary } from "./evaluation_process";
import { ValueExpression } from "./evaluation_model";

export function l18n<T>(data: Localized<T>) {
    if ("default" in data) {
        return data.default;
    }
    return data["en"];
}

export function evaluateExpression<U extends EvaluationValue>(summary: EvaluationSummary, expr: ValueExpression<U>): U | null {
    switch (expr.type) {
        case "constant":
            return expr.constant;
        case "ref":
            return summary.values[expr.ref] as U || null;
    }
}

