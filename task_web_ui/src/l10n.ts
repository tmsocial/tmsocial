interface AwareLocalized<T> {
    [language: string]: T;
}

interface UnawareLocalized<T> {
    default: T;
}

type Localized<T> = AwareLocalized<T> | UnawareLocalized<T>;

