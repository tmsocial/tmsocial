use atomicwrites::{AllowOverwrite, AtomicFile};
use failure::Error;
use log::{debug, trace};
use serde::{de::DeserializeOwned, Serialize};
use serde_json;
use std::fmt::Debug;
use std::fs::File;
use std::io::Write;
use std::ops::{Deref, DerefMut};
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub struct AutoSerialize<T> {
    obj: T,
    path: PathBuf,
}

fn save_impl<T: Serialize + Debug>(path: &Path, obj: &T) -> Result<(), Error> {
    debug!("Serializing {:?} to {}", obj, path.display());
    let af = AtomicFile::new(path, AllowOverwrite);
    af.write(|f| f.write_all(serde_json::to_string(obj)?.as_bytes()))?;
    Ok(())
}

impl<T: Serialize + DeserializeOwned + Clone + Debug> AutoSerialize<T> {
    pub fn new(path: &Path, t: T) -> AutoSerialize<T> {
        AutoSerialize::<T> {
            obj: t,
            path: PathBuf::from(path),
        }
    }

    pub fn load(path: &Path) -> Result<AutoSerialize<T>, Error> {
        debug!("Deserializing from {}", path.display());
        let t: T = serde_json::from_reader(File::open(path)?)?;
        debug!("Deserialized {:?} from {}", t, path.display());
        Ok(AutoSerialize::new(path, t))
    }

    pub fn edit<'a>(&'a mut self) -> Transaction<'a, T> {
        debug!("Editing {:?}", self.obj);
        let temp = self.obj.clone();
        Transaction::<'a, T> {
            obj: &mut self.obj,
            path: &self.path,
            temp: temp,
            mutated: false,
        }
    }

    pub fn save(&self) -> Result<(), Error> {
        save_impl(&self.path, &self.obj)
    }
}

impl<T: Debug> Deref for AutoSerialize<T> {
    type Target = T;
    fn deref(&self) -> &T {
        trace!("Reading from {:?}", self);
        &self.obj
    }
}

#[derive(Debug)]
pub struct Transaction<'a, T: Debug> {
    obj: &'a mut T,
    path: &'a Path,
    temp: T,
    mutated: bool,
}

impl<'a, T: Serialize + DeserializeOwned + Clone + Debug> Transaction<'a, T> {
    pub fn commit(self) -> Result<(), Error> {
        debug!("Committing {:?}, orig: {:?}", self.temp, self.obj);
        if !self.mutated {
            return Ok(());
        }
        save_impl(self.path, &self.temp)?;
        *self.obj = self.temp;
        Ok(())
    }
}

impl<'a, T: Debug> Deref for Transaction<'a, T> {
    type Target = T;
    fn deref(&self) -> &T {
        trace!("Reading from {:?}", self);
        &self.temp
    }
}

impl<'a, T: Debug> DerefMut for Transaction<'a, T> {
    fn deref_mut(&mut self) -> &mut T {
        trace!("Mutating {:?}", self);
        self.mutated = true;
        &mut self.temp
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Once, ONCE_INIT};
    use tempdir::TempDir;

    static INIT: Once = ONCE_INIT;
    fn setup() -> TempDir {
        INIT.call_once(|| {
            pretty_env_logger::init_custom_env("RUST_TEST_LOG");
        });
        TempDir::new("test").unwrap()
    }

    #[test]
    fn save_load() {
        let dir = setup();
        let v = AutoSerialize::new(&dir.path().join("foo"), 5);
        v.save().unwrap();
        let w = AutoSerialize::<i32>::load(&dir.path().join("foo")).unwrap();
        assert_eq!(*w, 5);
    }

    #[test]
    fn no_change_without_commit() {
        let dir = setup();
        let mut v = AutoSerialize::new(&dir.path().join("foo"), 5);
        let mut v_edit = v.edit();
        *v_edit = 3;
        assert_eq!(*v, 5);
    }

    #[test]
    fn commit_works() {
        let dir = setup();
        let mut v = AutoSerialize::new(&dir.path().join("foo"), 5);
        let mut v_edit = v.edit();
        *v_edit = 3;
        v_edit.commit().unwrap();
        assert_eq!(*v, 3);
    }

    #[test]
    fn commit_load() {
        let dir = setup();
        let mut v = AutoSerialize::new(&dir.path().join("foo"), 5);
        let mut v_edit = v.edit();
        *v_edit = 3;
        v_edit.commit().unwrap();
        let w = AutoSerialize::<i32>::load(&dir.path().join("foo")).unwrap();
        assert_eq!(*w, 3);
    }
}
