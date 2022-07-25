#![allow(clippy::not_unsafe_ptr_arg_deref)]

use swc_plugin::{ast::*, plugin_transform, TransformPluginProgramMetadata};

static ATOM_IMPORTS: &[&str] = &[
    "atom",
    "atomFamily",
    "atomWithDefault",
    "atomWithObservable",
    "atomWithReducer",
    "atomWithReset",
    "atomWithStorage",
    "freezeAtom",
    "loadable",
    "selectAtom",
    "splitAtom",
];

struct DebugLabelTransformVisitor {
    current_var_declarator: Option<String>,
}

impl DebugLabelTransformVisitor {
    pub fn new() -> Self {
        Self {
            current_var_declarator: None,
        }
    }
}

impl VisitMut for DebugLabelTransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_var_declarator(&mut self, var_declarator: &mut VarDeclarator) {
        let old_var_declarator = self.current_var_declarator.take();

        self.current_var_declarator =
            if let Pat::Ident(BindingIdent { id, .. }) = &var_declarator.name {
                Some(id.sym.to_string())
            } else {
                None
            };

        var_declarator.visit_mut_children_with(self);

        self.current_var_declarator = old_var_declarator;
    }

    fn visit_mut_call_expr(&mut self, call_expr: &mut CallExpr) {
        if self.current_var_declarator.is_none() {
            return;
        }

        call_expr.visit_mut_children_with(self);

        if let Callee::Expr(expr) = &call_expr.callee {
            if let Expr::Ident(id) = &**expr {
                if ATOM_IMPORTS.contains(&&*id.sym) {

                }
            }
        }
    }
}

#[plugin_transform]
pub fn process_transform(program: Program, _metadata: TransformPluginProgramMetadata) -> Program {
    program.fold_with(&mut as_folder(DebugLabelTransformVisitor::new()))
}
