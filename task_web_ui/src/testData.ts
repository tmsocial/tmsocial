import { ValueEvent, Score, EvaluationEvent } from "./evaluation";
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
                type: "time_usage",
                name: "compilation.time_usage",
            },
            {
                type: "score",
                name: "test_case.1.my_score",
                max_score: 60,
            },
            {
                type: "percentage",
                name: "test_case.1.my_percentage",
                precision: 1,
            },
            {
                type: "time_usage",
                name: "test_case.1.my_time_usage",
            },
            {
                type: "memory_usage",
                name: "test_case.1.my_memory_usage",
            },
            {
                type: "score",
                name: "test_case.2.my_score",
                max_score: 40,
            },
            {
                type: "percentage",
                name: "test_case.2.my_percentage",
                precision: 1,
            },
            {
                type: "time_usage",
                name: "test_case.2.my_time_usage",
            },
            {
                type: "memory_usage",
                name: "test_case.2.my_memory_usage",
            },
        ],
    }
};

export const testEvaluation: EvaluationEvent[] = [
    {
        type: "value",
        key: "compilation.time_usage",
        value: {
            type: "time_usage",
            time_usage_seconds: 2.4,
        },
    },
    {
        type: "value",
        key: "test_case.1.my_score",
        value: {
            type: "score",
            score: 42.0,
        },
    },
    {
        type: "value",
        key: "test_case.1.my_percentage",
        value: {
            type: "fraction",
            fraction: 0.7,
        },
    },
    {
        type: "value",
        key: "test_case.2.my_percentage",
        value: {
            type: "fraction",
            fraction: 0.2,
        },
    },
    {
        type: "value",
        key: "test_case.2.my_time_usage",
        value: {
            type: "time_usage",
            time_usage_seconds: 0.1234,
        },
    },
    {
        type: "value",
        key: "test_case.2.my_memory_usage",
        value: {
            type: "memory_usage",
            memory_usage_bytes: 123456,
        },
    },
]