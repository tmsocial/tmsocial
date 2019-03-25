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
                value: {
                    type: "ref",
                    ref: "compilation.time_usage",
                },
            },
            {
                type: "table",
                columns: [
                    {
                        key: "name",
                        model: {
                            type: "name",
                        }
                    },
                    {
                        key: "total_score",
                        model: {
                            type: "score",
                        }
                    },
                    {
                        key: "total_percentage",
                        model: {
                            type: "percentage",
                        },
                    },
                    {
                        key: "total_memory_usage",
                        model: {
                            type: "memory_usage",
                        },
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
                            name: {
                                type: "name",
                                name: {
                                    en: "Test case 1",
                                    it: "Caso di prova 1",
                                }
                            },
                            total_score: {
                                type: "score",
                                value: {
                                    type: "ref",
                                    ref: "test_case.1.total_score",
                                },
                                max_score: 60,
                            },
                            total_memory_usage: {
                                type: "memory_usage",
                                value: {
                                    type: "ref",
                                    ref: "test_case.1.total_memory_usage"
                                }
                            },
                            total_percentage: {
                                type: "percentage",
                                value: {
                                    type: "ref",
                                    ref: "test_case.1.total_percentage",
                                },
                            },
                            alice_time_usage: {
                                type: "time_usage",
                                value: {
                                    type: "ref",
                                    ref: "test_case.1.alice_time_usage",
                                },
                            },
                            bob_time_usage: {
                                type: "time_usage",
                                value: {
                                    type: "ref",
                                    ref: "test_case.1.bob_time_usage",
                                },
                            },
                        },
                    },
                    {
                        cells: {
                            name: {
                                type: "name",
                                name: {
                                    en: "Test case 2",
                                    it: "Caso di prova 2",
                                }
                            },
                            total_score: {
                                type: "score",
                                value: {
                                    type: "ref",
                                    ref: "test_case.2.total_score",
                                },
                                max_score: 20,
                            },
                            total_memory_usage: {
                                type: "memory_usage",
                                value: {
                                    type: "ref",
                                    ref: "test_case.2.total_memory_usage"
                                }
                            },
                            total_percentage: {
                                type: "percentage",
                                value: {
                                    type: "ref",
                                    ref: "test_case.2.total_percentage",
                                },
                            },
                            alice_time_usage: {
                                type: "time_usage",
                                value: {
                                    type: "ref",
                                    ref: "test_case.2.alice_time_usage",
                                },
                            },
                            bob_time_usage: {
                                type: "time_usage",
                                value: {
                                    type: "ref",
                                    ref: "test_case.2.bob_time_usage",
                                },
                            },
                        },
                    },
                ]
            },
            {
                type: "text_stream",
                stream: "stdout",
            },
        ],
    }
};

export const testEvaluation: EvaluationEvent[] = [
    {
        type: "text",
        stream: "stdout",
        text: "Begin evaluation...\n",
    },
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
        key: "test_case.1.total_percentage",
        value: {
            type: "fraction",
            fraction: 0.7,
        },
    },
    {
        type: "value",
        key: "test_case.2.total_percentage",
        value: {
            type: "fraction",
            fraction: 0.2,
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
        key: "test_case.1.total_memory_usage",
        value: {
            type: "memory_usage",
            memory_usage_bytes: 400999,
        },
    },
    {
        type: "value",
        key: "test_case.2.total_memory_usage",
        value: {
            type: "memory_usage",
            memory_usage_bytes: 123456,
        },
    },
    {
        type: "text",
        stream: "stdout",
        text: "Evaluation finished\n",
    },
]