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
                type: "table",
                columns: [
                    {
                        key: "total_score",
                        model: {
                            type: "score",
                        }
                    },
                    {
                        key: "alice_time_usage",
                        model: {
                            type: "time_usage",
                        }
                    },
                    {
                        key: "bob_time_usage",
                        model: {
                            type: "time_usage",
                        }
                    },
                ],
                rows: [
                    {
                        cells: {
                            total_score: {
                                type: "score",
                                name: "test_case.1.total_score",
                                max_score: 60,
                            },
                            alice_time_usage: {
                                type: "time_usage",
                                name: "test_case.1.alice_time_usage",
                            },
                            bob_time_usage: {
                                type: "time_usage",
                                name: "test_case.1.bob_time_usage",
                            },
                        },
                    },
                    {
                        cells: {
                            total_score: {
                                type: "score",
                                name: "test_case.2.total_score",
                                max_score: 20,
                            },
                            alice_time_usage: {
                                type: "time_usage",
                                name: "test_case.2.alice_time_usage",
                            },
                            bob_time_usage: {
                                type: "time_usage",
                                name: "test_case.2.bob_time_usage",
                            },
                        },
                    },
                ]
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
        key: "test_case.1.total_score",
        value: {
            type: "score",
            score: 10.0,
        },
    },
    {
        type: "value",
        key: "test_case.1.alice_time_usage",
        value: {
            type: "time_usage",
            time_usage_seconds: 0.2,
        },
    },
    {
        type: "value",
        key: "test_case.1.bob_time_usage",
        value: {
            type: "time_usage",
            time_usage_seconds: 0.1,
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
        key: "test_case.2.bob_time_usage",
        value: {
            type: "time_usage",
            time_usage_seconds: 2.3,
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