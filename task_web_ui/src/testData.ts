import { SetFieldEvent, Score } from "./evaluation";

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
        type: "score_view",
        name: "my_score_field",
    },
};

export const testEvaluation: SetFieldEvent<Score>[] = [
    {
        type: "set_field",
        name: "my_score_field",
        value: {
            type: "score",
            score: 42.0,
        }
    }
]