class HealthAIRouter:
    """
    Routes unmanaged ETL models to the 'etl' (SQLite) database.
    All managed Django models (auth, sessions, PendingChange, UserProfile, MealEntry)
    go to 'default' (PostgreSQL).
    """

    def db_for_read(self, model, **hints):
        if not model._meta.managed:
            return 'etl'
        return 'default'

    def db_for_write(self, model, **hints):
        if not model._meta.managed:
            return 'etl'
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # ETL schema is owned by BDD.sql — Django never migrates the etl DB
        if db == 'etl':
            return False
        return True
