use log::{debug, trace};
use serde::{de::DeserializeOwned, Serialize};
use std::fmt::Debug;
use std::ops::{Deref, DerefMut};

#[derive(Debug)]
pub struct AutoSerialize<T> {
    obj: T,
}

impl<T: Serialize + DeserializeOwned + Clone + Debug> AutoSerialize<T> {
    pub fn new(t: T) -> AutoSerialize<T> {
        AutoSerialize::<T> { obj: t }
    }

    pub fn edit<'a>(&'a mut self) -> Transaction<'a, T> {
        debug!("Editing {:?}", self.obj);
        let temp = self.obj.clone();
        Transaction::<'a, T> {
            obj: &mut self.obj,
            temp: temp,
            mutated: false,
        }
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
    temp: T,
    mutated: bool,
}

impl<'a, T: Serialize + DeserializeOwned + Clone + Debug> Transaction<'a, T> {
    pub fn commit(self) -> Result<(), ()> {
        debug!("Committing {:?}, orig: {:?}", self.temp, self.obj);
        if !self.mutated {
            return Ok(());
        }
        // TODO: serialize
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

    static INIT: Once = ONCE_INIT;
    fn setup() {
        INIT.call_once(|| {
            pretty_env_logger::init_custom_env("RUST_TEST_LOG");
        });
    }

    #[test]
    fn no_change_without_commit() {
        setup();
        let mut v = AutoSerialize::new(5);
        let mut v_edit = v.edit();
        *v_edit = 3;
        assert_eq!(*v, 5);
    }

    #[test]
    fn commit_works() {
        setup();
        let mut v = AutoSerialize::new(5);
        let mut v_edit = v.edit();
        *v_edit = 3;
        v_edit.commit().unwrap();
        assert_eq!(*v, 3);
    }
}
