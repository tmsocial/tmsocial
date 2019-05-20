interface AwareLocalized<T> {
    [language: string]: T;
}

interface UnawareLocalized<T> {
    default: T;
}

export type Localized<T> = AwareLocalized<T> | UnawareLocalized<T>;

export function localize<T>(data: Localized<T>) {
    if ("default" in data) {
        return data.default;
    }
    const someLang = Object.keys(data)[0];
    if(someLang === undefined) {
        console.log(data);
        throw new Error("Localized object does not contain any language.")
    }
    return data[someLang];
}
