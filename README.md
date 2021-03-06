# TMSocial

TMSocial: a Web platform that allows users to solve programming challanges.

TMSocial aims to support tasks of different kinds and based on different systems, thanks to the backed `task-maker`, including:

- tasks based on Contest Management System (CMS),
- tasks based on TuringArena,
- tasks from International Olympiad in Informatics (IOI),
- tasks from other national and international programming competitions.

## Design choices for interoperability among task types

For every task, the backend must be able to do the following.

1. Generate the task files and metadata, which include:
    - *task metadata* represented in JSON format,
    - a collection of zero or more *task files*.
2. Evaluate a *submission* (as defined below) to produce an *evaluation*, which consists of:
    - a stream of *evaluation events*, each represented as a JSON object.

### Task metadata

The task metadata is the entry point of a task. It is a JSON object which specifies:

- the *task statement*, selecting among several supported formats (including at least HTML and PDF), possibly pointing to files generated by the backend,
- the list of *task attachments*, pointing to files generated by the backend,
- the *submission form*, i.e., the format of a submission,
- the *evaluation model*, which is used together with the stream of evaluation events to interpret and display an evaluation.

In the following each of the above items is explained in detail.
See the TypeScript interface `TaskMetadata`, defined in `task_web_ui/src/metadata.ts`, for the proposed JSON format.

### Task statement

The task statement can be provided in one or more formats. Localization is handled by each format separately.
If multiple formats are used, they should be equivalent in their content. When displaying the statement, the format most appropriate (according to media and user choice) is used.
For example, a task may provide a statement in the following formats:

- HTML, for viewing it on the Web,
- PDF, for printing,
- Markdown, for other uses such as reading the task statement from a CLI.

### Task attachments

The task attachments is a list. Each item specifies a title, a file name, a content type and the actual content.
The list itself is identical for every localization, while the title and the actual file for each item are localized.

### Submission forms and submissions

The submission form is an ordered list of *submission fields*, each including:

- the *field name* (lowercase ASCII words separated by underscore),
- whether the field is required or not,
- (optional) a list of *file type options*, each defining:
    - a name (for machine use),
    - a localized title (for display),
    - (optional) a set of file extensions (e.g., `.cc`) which are usually associated with the given type.

Field names must be unique.

A submission maps each field (identified by its name) to a *submission file* and a *submission file type*, chosen among the file type options if provided.
A submission file comprises the file content and the file name.
The file name is retained as specified for HTML forms (in particular, only the base name is retained, not the path).
Conversely, the original content type is dropped, and replaced with the file type options if needed.
The set of file extensions for each file type is only a hint for the UI, adn is not enforced.

### Evaluation model

The evaluation model is a tree structure where the root and possibly other nodes have polymorphic types.

This structures encodes:

- all the information about an evaluation which should be known beforehand,
    - (example: the subtasks, their maximum score, their test cases, etc.)
- the meaning of these informations, which is used to present the information for the user:
    - (example: whether a score is a percentage or an absolute value, etc.)

TODO: defining the various node types available to construct an evaluation model is the most challenging part.
It will be done first as code examples, and will be documented later when it is agreed upon.

## Evaluation events

An evaluation produces a stream of evaluation events: each one of them is an arbitrary JSON object, that must have a field `type` that identifies the type of the event. If an event of an unknown type arrives to the frontend it will be simply ignored. 

Currentlly the only event type supported is `value`. This event has the following properties:
- `key`: an arbitrary string that identifies the field, by convention a string of identifies separated by `.`, for example `test_case.1.memory_usage` 
- `value`: a polymorfic JSON object as specified in the code

A `value` event is produced by the backend to declare the value of a key for the evaluation, for example the event ```{"type": "value", "key": "test_case.1.memory_usage", "value": {"type": "memory_usage", "memory_usage_bytes": 10230042 }}``` declares that the memory usage of the first test case is 10230042 bytes. There must not be two `value` events with the same key in the same evaluation. 

In the future more events types will be defined, for example to update values dynamically or to generate messages.
