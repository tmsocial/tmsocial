import { SetFieldEvent, Score, EvaluationEvent } from "./evaluation";
import { TaskMetadata } from "./metadata";

export const testMetadata: TaskMetadata = {
    title: {
        en: "Test task",
        it: "Task di prova",
    },
    statement: {
        type: "pdf",
        url: {
            default: "nothing",
        },
    },
    attachments: [],
    submission_form: {
        fields: {
            solution: {
                type: "file",
                required: true,
                title: {
                    en: "Solution",
                    it: "Soluzione",
                },
            }
        }
    },
    evaluation_model: {
        type: "list_view",
        items: [
            {
                type: "score_view",
                name: "my_score_field",
            },
            {
                type: "percentage_view",
                name: "my_percentage_field",
                precision: 1,
            }
        ]
    }
};

export const testEvaluation: EvaluationEvent[] = [
    {
        type: "set_field",
        name: "my_score_field",
        value: {
            type: "score",
            score: 42.0,
        }
    },
    {
        type: "set_field",
        name: "my_percentage_field",
        value: {
            type: "fraction",
            fraction: 0.7,
        },
    },
]