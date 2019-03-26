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
    evaluation_sections: [
        {
            type: "table",
            header_column: {
                name: {
                    en: "Test case",
                },
            },
            columns: [
                {
                    type: "memory_usage",
                    name: {
                        en: "Memory usage",
                    },
                },
                {
                    type: "time_usage",
                    name: {
                        en: "Time usage"
                    },
                },
                {
                    type: "score",
                    name: {
                        en: "Score"
                    },
                },
                {
                    type: "percentage",
                    name: {
                        en: "Percentage"
                    },
                },
            ],
            groups: [
                {
                    name: {
                        en: "Subtask 1",
                    },
                    rows: [
                        {
                            name: {
                                default: "1",
                            },
                            cells: [
                                {
                                    value: {
                                        type: "ref",
                                        ref: "my_memory_usage"
                                    }
                                },
                                {
                                    value: {
                                        type: "ref",
                                        ref: "my_time_usage"
                                    }
                                },
                                {
                                    value: {
                                        type: "ref",
                                        ref: "my_score"
                                    },
                                    max_score: 10,
                                },
                                {
                                    value: {
                                        type: "ref",
                                        ref: "my_percentage"
                                    },
                                    precision: 1,
                                },
                            ]
                        }
                    ]
                },
                {
                    name: {
                        en: "Subtask 2",
                    },
                    rows: [
                        {
                            name: {
                                default: "2",
                            },
                            cells: [
                                {
                                    value: {
                                        type: "ref",
                                        ref: "my_memory_usage"
                                    }
                                },
                                {
                                    value: {
                                        type: "ref",
                                        ref: "my_time_usage"
                                    }
                                },
                                {
                                    value: {
                                        type: "ref",
                                        ref: "my_score"
                                    },
                                    max_score: 10,
                                },
                                {
                                    value: {
                                        type: "ref",
                                        ref: "my_percentage"
                                    },
                                    precision: 1,
                                },
                            ]
                        },
                        {
                            name: {
                                default: "3",
                            },
                            cells: [
                                {
                                    value: {
                                        type: "ref",
                                        ref: "my_memory_usage"
                                    }
                                },
                                {
                                    value: {
                                        type: "ref",
                                        ref: "my_time_usage"
                                    }
                                },
                                {
                                    value: {
                                        type: "ref",
                                        ref: "my_score"
                                    },
                                    max_score: 10,
                                },
                                {
                                    value: {
                                        type: "ref",
                                        ref: "my_percentage"
                                    },
                                    precision: 1,
                                },
                            ]
                        },
                    ]
                },
            ]
        },
        {
            type: "text_stream",
            stream: "stdout",
        },
    ],
};

export const testEvaluation: EvaluationEvent[] = [
    {
        type: "text",
        stream: "stdout",
        text: "Begin evaluation...\n",
    },
    {
        type: "value",
        key: "my_memory_usage",
        value: {
            type: "memory_usage",
            memory_usage_bytes: 400999,
        },
    },
    {
        type: "value",
        key: "my_time_usage",
        value: {
            type: "time_usage",
            time_usage_seconds: 2.4,
        },
    },
    {
        type: "value",
        key: "my_score",
        value: {
            type: "score",
            score: 2.4,
        },
    },
    {
        type: "value",
        key: "my_percentage",
        value: {
            type: "fraction",
            fraction: 0.5,
        },
    },
    {
        type: "text",
        stream: "stdout",
        text: "Evaluation finished\n",
    },
]
