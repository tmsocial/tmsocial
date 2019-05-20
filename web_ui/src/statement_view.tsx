import * as React from 'react';
import { Statement } from "./metadata";
import { localize } from './l10n';

export const StatementView = ({ statement }: { statement: Statement }) => (
    <React.Fragment>
        {statement.pdf_base64 && <a download href={`data:application/pdf;base64,${localize(statement.pdf_base64)}`}>Download PDF</a>}
        {statement.html && <iframe className="task_statement_html" srcDoc={localize(statement.html)} sandbox="allow-scripts" />}
    </React.Fragment>
)
