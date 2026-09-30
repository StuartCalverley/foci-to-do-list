import type Database from "better-sqlite3";
import type { TodoRepository } from "./TodoRepository.js";
import type { Todo } from "../model/todo.js";

interface TodoRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  is_completed: number;
  created_at: string;
}

function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    ...(row.description !== null ? { description: row.description } : {}),
    ...(row.due_date !== null ? { dueDate: row.due_date } : {}),
    isCompleted: row.is_completed === 1,
    createdAt: row.created_at,
  };
}

export class SqliteTodoRepository implements TodoRepository {
  constructor(private readonly db: Database.Database) {}

  findById(id: string): Todo | undefined {
    console.log("AM I IN EHRE");
    const row = this.db
      .prepare(
        "SELECT id, title, description, due_date, is_completed, created_at FROM todos WHERE id = ?",
      )
      .get(id) as TodoRow | undefined;
    return row === undefined ? undefined : toTodo(row);
  }

  findAll(): Todo[] {
    const rows = this.db
      .prepare(
        "SELECT id, title, description, due_date, is_completed, created_at FROM todos",
      )
      .all() as TodoRow[];
    return rows.map(toTodo);
  }

  insert(todo: Todo): void {
    this.db
      .prepare(
        `
        INSERT INTO todos (id, title, description, due_date, is_completed, created_at)
        VALUES (@id, @title, @description, @dueDate, @isCompleted, @createdAt)
      `,
      )
      .run({
        id: todo.id,
        title: todo.title,
        description: todo.description ?? null,
        dueDate: todo.dueDate ?? null,
        isCompleted: todo.isCompleted ? 1 : 0,
        createdAt: todo.createdAt,
      });
  }

  update(todo: Todo): void {
    this.db
      .prepare(
        `
        UPDATE todos
        SET title = @title, description = @description,
            due_date = @dueDate, is_completed = @isCompleted
        WHERE id = @id
      `,
      )
      .run({
        id: todo.id,
        title: todo.title,
        description: todo.description ?? null,
        dueDate: todo.dueDate ?? null,
        isCompleted: todo.isCompleted ? 1 : 0,
      });
  }

  delete(id: string): void {
    this.db.prepare("DELETE FROM todos WHERE id = ?").run(id);
  }
}
