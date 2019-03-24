/// Serializer and deserializer for `HashMap<K, V>` where `K` may not be a
/// `String`.
///
/// # Example
///
/// ```
/// extern crate serde_json;
/// use serde_derive::{Deserialize, Serialize};
/// use tmsocial::task_maker_ui::hash_map_serializers::*;
/// use std::collections::HashMap;
///
/// #[derive(Serialize, Deserialize)]
/// struct Foo {
///     #[serde(with = "serialize_hash_map")]
///     map: HashMap<i32, String>,
/// }
/// ```
pub mod serialize_hash_map {
    use std::cmp::Eq;
    use std::collections::HashMap;
    use std::fmt::Display;
    use std::hash::Hash;
    use std::str::FromStr;

    use serde::de::{self, Deserialize, Deserializer};
    use serde::ser::Serializer;

    pub fn serialize<K, V, S>(
        map: &HashMap<K, V>,
        serializer: S,
    ) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
        K: Eq + Hash + serde::Serialize,
        V: serde::Serialize,
    {
        serializer.collect_map(map)
    }

    pub fn deserialize<'de, K, V, D>(
        deserializer: D,
    ) -> Result<HashMap<K, V>, D::Error>
    where
        D: Deserializer<'de>,
        K: FromStr + Eq + Hash,
        <K as FromStr>::Err: Display,
        HashMap<String, V>: serde::Deserialize<'de>,
    {
        let mut map = HashMap::new();
        for item in HashMap::<String, V>::deserialize(deserializer)? {
            map.insert(item.0.parse::<K>().map_err(de::Error::custom)?, item.1);
        }
        Ok(map)
    }
}

/// Serializer and deserializer for `HashMap<K, HashMap<K2, V>>` where `K` and
/// `K2` may not be a `String`.
///
/// # Example
///
/// ```
/// extern crate serde_json;
/// use serde_derive::{Deserialize, Serialize};
/// use tmsocial::task_maker_ui::hash_map_serializers::*;
/// use std::collections::HashMap;
///
/// #[derive(Serialize, Deserialize)]
/// struct Foo {
///     #[serde(with = "serialize_double_hash_map")]
///     map: HashMap<i32, HashMap<u32, String>>,
/// }
/// ```
pub mod serialize_double_hash_map {
    use std::cmp::Eq;
    use std::collections::HashMap;
    use std::fmt::Display;
    use std::hash::Hash;
    use std::str::FromStr;

    use serde::de::{self, Deserialize, Deserializer};
    use serde::ser::Serializer;

    pub fn serialize<K, K2, V, S>(
        map: &HashMap<K, HashMap<K2, V>>,
        serializer: S,
    ) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
        K: Eq + Hash + serde::Serialize,
        K2: Eq + Hash + serde::Serialize,
        V: serde::Serialize,
    {
        serializer.collect_map(map)
    }

    pub fn deserialize<'de, K, K2, V, D>(
        deserializer: D,
    ) -> Result<HashMap<K, HashMap<K2, V>>, D::Error>
    where
        D: Deserializer<'de>,
        K: FromStr + Eq + Hash,
        K2: FromStr + Eq + Hash,
        <K as FromStr>::Err: Display,
        <K2 as FromStr>::Err: Display,
        HashMap<String, HashMap<String, V>>: serde::Deserialize<'de>,
    {
        let mut outer_map = HashMap::new();
        for outer in
            HashMap::<String, HashMap<String, V>>::deserialize(deserializer)?
        {
            let mut inner_map = HashMap::new();
            for inner in outer.1 {
                inner_map.insert(
                    inner.0.parse::<K2>().map_err(de::Error::custom)?,
                    inner.1,
                );
            }
            outer_map.insert(
                outer.0.parse::<K>().map_err(de::Error::custom)?,
                inner_map,
            );
        }
        Ok(outer_map)
    }
}
