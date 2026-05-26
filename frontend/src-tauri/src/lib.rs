use tauri_plugin_sql::{Migration, MigrationKind};

const CREATE_TABLES: &str = "
  CREATE TABLE IF NOT EXISTS cards            (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS statements       (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS transactions     (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS categories       (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS category_rules   (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS budgets          (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS goals            (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS recurring        (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS imports          (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS settings         (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS investments      (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS investment_moves (id TEXT PRIMARY KEY, data TEXT NOT NULL);
";

const ADD_HABITUAL_TABLE: &str = "
  CREATE TABLE IF NOT EXISTS habitual (id TEXT PRIMARY KEY, data TEXT NOT NULL);
";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let migrations = vec![
    Migration {
      version: 1,
      description: "create_initial_tables",
      sql: CREATE_TABLES,
      kind: MigrationKind::Up,
    },
    Migration {
      version: 2,
      description: "add_habitual_table",
      sql: ADD_HABITUAL_TABLE,
      kind: MigrationKind::Up,
    },
  ];

  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .plugin(
      tauri_plugin_sql::Builder::new()
        .add_migrations("sqlite:gestor.db", migrations)
        .build(),
    )
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
