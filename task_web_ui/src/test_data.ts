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
            columns: [
                {
                    type: "memory_usage",
                },
                {
                    type: "time_usage",
                },
            ],
            groups: [
                {
                    rows: [
                        {
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
                            ]
                        }
                    ]
                }
            ]
        }
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
        type: "text",
        stream: "stdout",
        text: "Evaluation finished\n",
    },
]
