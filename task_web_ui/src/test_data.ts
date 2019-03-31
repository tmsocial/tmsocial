import { ValueEvent, Score, EvaluationEvent } from "./evaluation";
import { TaskMetadata } from "./metadata";
import { number } from "prop-types";

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
            columns: [
                {
                    type: "row_number",
                    name: {
                        en: "Test case",
                    },
                },
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
                    score_precision: 2,
                    max_score_precision: 0,
                },
                {
                    type: "percentage",
                    name: {
                        en: "Percentage"
                    },
                    precision: 2,
                },
            ],
            groups: [
                {
                    header: {
                        title: {
                            en: "Subtask 1",
                        },
                    },
                    rows: [
                        {
                            cells: [
                                {
                                    number: 1,
                                },
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
                                },
                            ]
                        }
                    ]
                },
                {
                    header: {
                        title: {
                            en: "Subtask 2",
                        },
                    },
                    rows: [
                        {
                            cells: [
                                {
                                    number: 2,
                                },
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
                                },
                            ]
                        },
                        {
                            cells: [
                                {
                                    number: 3,
                                },
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
