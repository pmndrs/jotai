#![allow(clippy::not_unsafe_ptr_arg_deref)]

use swc_plugin::{
    ast::*, metadata::TransformPluginProgramMetadata, plugin_transform, syntax_pos::DUMMY_SP,
    utils::StmtLike,
};

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
    current_var_declarator: Option<JsWord>,
    debug_label_expr: Option<Expr>,
}

impl DebugLabelTransformVisitor {
    pub fn new() -> Self {
        Self {
            current_var_declarator: None,
            debug_label_expr: None,
        }
    }
}

impl DebugLabelTransformVisitor {
    fn visit_mut_stmt_like<T>(&mut self, stmts: &mut Vec<T>)
    where
        Vec<T>: VisitMutWith<Self>,
        T: StmtLike,
    {
        stmts.visit_mut_children_with(self);

        if self.debug_label_expr.is_none() {
            return;
        }

        stmts.push(T::from_stmt(Stmt::Expr(ExprStmt {
            span: DUMMY_SP,
            expr: Box::new(self.debug_label_expr.take().unwrap()),
        })))
    }
}

impl VisitMut for DebugLabelTransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_var_declarator(&mut self, var_declarator: &mut VarDeclarator) {
        let old_var_declarator = self.current_var_declarator.take();

        self.current_var_declarator =
            if let Pat::Ident(BindingIdent { id, .. }) = &var_declarator.name {
                Some(id.sym.clone())
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

        let atom_name = self.current_var_declarator.as_ref().unwrap();
        if let Callee::Expr(expr) = &call_expr.callee {
            if let Expr::Ident(id) = &**expr {
                if ATOM_IMPORTS.contains(&&*id.sym) {
                    self.debug_label_expr = Some(Expr::Assign(AssignExpr {
                        left: PatOrExpr::Expr(Box::new(Expr::Member(MemberExpr {
                            obj: Box::new(Expr::Ident(Ident {
                                sym: atom_name.clone(),
                                span: DUMMY_SP,
                                optional: false,
                            })),
                            prop: MemberProp::Ident(Ident {
                                sym: "debugLabel".into(),
                                span: DUMMY_SP,
                                optional: false,
                            }),
                            span: DUMMY_SP,
                        }))),
                        right: Box::new(Expr::Lit(Lit::Str(Str {
                            value: atom_name.clone(),
                            span: DUMMY_SP,
                            raw: None,
                        }))),
                        op: op!("="),
                        span: DUMMY_SP,
                    }))
                }
            }
        }
    }

    fn visit_mut_module_items(&mut self, items: &mut Vec<ModuleItem>) {
        self.visit_mut_stmt_like(items);
    }

    fn visit_mut_stmts(&mut self, stmts: &mut Vec<Stmt>) {
        self.visit_mut_stmt_like(stmts);
    }
}

#[plugin_transform]
pub fn debug_label_transform(
    program: Program,
    _metadata: TransformPluginProgramMetadata,
) -> Program {
    program.fold_with(&mut as_folder(DebugLabelTransformVisitor::new()))
}

#[cfg(test)]
mod tests {
    use swc_ecma_parser::*;
    use swc_ecma_transforms_base::resolver;
    use swc_ecma_transforms_testing::test;
    use swc_plugin::{syntax_pos::Mark, *};

    use super::*;

    fn transform() -> impl Fold {
        chain!(
            resolver(Mark::new(), Mark::new(), false),
            as_folder(DebugLabelTransformVisitor::new())
        )
    }

    test!(
        Syntax::default(),
        |_| transform(),
        basic,
        "const countAtom = atom(0);",
        r#"const countAtom = atom(0);
countAtom.debugLabel = "countAtom";
        "#
    );
}
