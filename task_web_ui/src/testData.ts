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
        type: "list",
        items: [
            {
                type: "score",
                name: "my_score_field",
            },
            {
                type: "percentage",
                name: "my_percentage_field",
                precision: 1,
            },
            {
                type: "time_usage",
                name: "my_time_usage_field",
            },
            {
                type: "memory_usage",
                name: "my_memory_usage_field",
            },
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
        },
    },
    {
        type: "set_field",
        name: "my_percentage_field",
        value: {
            type: "fraction",
            fraction: 0.7,
        },
    },
    {
        type: "set_field",
        name: "my_time_usage_field",
        value: {
            type: "time_usage",
            time_usage_seconds: 0.1234,
        },
    },
    {
        type: "set_field",
        name: "my_memory_usage_field",
        value: {
            type: "memory_usage",
            memory_usage_bytes: 123456,
        },
    },
]