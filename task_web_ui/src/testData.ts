import { ResolveFieldEvent, Score, EvaluationEvent } from "./evaluation";
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
        type: "record",
        items: [
            {
                type: "scope",
                key: "compilation",
                child: {
                    type: "record",
                    items: [
                        {
                            type: "time_usage",
                            name: "time_usage",
                        },
                    ]
                },
            },
            {
                type: "scope",
                key: "test_case",
                child: {
                    type: "array",
                    keys: [1, 2],
                    child_model: {
                        type: "record",
                        items: [
                            {
                                type: "score",
                                name: "my_score_field",
                                max_score: 100,
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
                    },
                },
            },
        ],
    }
};

export const testEvaluation: EvaluationEvent[] = [
    {
        type: "resolve_field",
        path: ["compilation", "time_usage"],
        value: {
            type: "time_usage",
            time_usage_seconds: 2.4,
        },
    },
    {
        type: "resolve_field",
        path: ["test_case", 1, "my_score_field"],
        value: {
            type: "score",
            score: 42.0,
        },
    },
    {
        type: "resolve_field",
        path: ["test_case", 1, "my_percentage_field"],
        value: {
            type: "fraction",
            fraction: 0.7,
        },
    },
    {
        type: "resolve_field",
        path: ["test_case", 2, "my_percentage_field"],
        value: {
            type: "fraction",
            fraction: 0.2,
        },
    },
    {
        type: "resolve_field",
        path: ["test_case", 2, "my_time_usage_field"],
        value: {
            type: "time_usage",
            time_usage_seconds: 0.1234,
        },
    },
    {
        type: "resolve_field",
        path: ["test_case", 2, "my_memory_usage_field"],
        value: {
            type: "memory_usage",
            memory_usage_bytes: 123456,
        },
    },
]