#![allow(clippy::not_unsafe_ptr_arg_deref)]

use swc_plugin::{ast::*, metadata::TransformPluginProgramMetadata, plugin_transform};

pub struct TransformVisitor;

impl VisitMut for TransformVisitor {
    // Implement necessary visit_mut_* methods for actual custom transform.
    // A comprehensive list of possible visitor methods can be found here:
    // https://rustdoc.swc.rs/swc_ecma_visit/trait.VisitMut.html
}

#[plugin_transform]
pub fn process_transform(_program: Program, _metadata: TransformPluginProgramMetadata) -> Program {
    unimplemented!()
}
