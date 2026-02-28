declare module 'sql.js' {
	export interface SqlJsStatic {
		Database: new (data?: ArrayLike<number>) => Database;
	}

	export interface Database {
		exec(sql: string, params?: unknown[]): QueryExecResult[];
		prepare(sql: string): Statement;
		close(): void;
	}

	export interface Statement {
		bind(values: unknown[] | Record<string, unknown>): boolean;
		step(): boolean;
		get(params?: unknown[] | Record<string, unknown>, config?: unknown): SqlValue[];
		getAsObject(params?: unknown[] | Record<string, unknown>): Record<string, SqlValue>;
		getColumnNames(): string[];
		free(): boolean;
	}

	export interface QueryExecResult {
		columns: string[];
		values: SqlValue[][];
	}

	export type SqlValue = string | number | Uint8Array | null;

	export interface InitSqlJsOptions {
		locateFile?: (file: string) => string;
	}

	export default function initSqlJs(options?: InitSqlJsOptions): Promise<SqlJsStatic>;
}
