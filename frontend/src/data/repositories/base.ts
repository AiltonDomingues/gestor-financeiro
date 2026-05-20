import type { StorageAdapter } from "../storage/adapter";

export type Entity = { id: string };

export class BaseRepository<T extends Entity> {
  constructor(
    protected readonly store: string,
    protected readonly adapter: StorageAdapter,
  ) {}

  list(): Promise<T[]> {
    return this.adapter.list<T>(this.store);
  }

  get(id: string): Promise<T | undefined> {
    return this.adapter.get<T>(this.store, id);
  }

  async create(entity: T): Promise<T> {
    await this.adapter.set(this.store, entity.id, entity);
    return entity;
  }

  async update(id: string, patch: Partial<T>): Promise<T> {
    const existing = await this.adapter.get<T>(this.store, id);
    if (!existing) throw new Error(`[${this.store}] Entity not found: ${id}`);
    const updated = { ...existing, ...patch, id } as T;
    await this.adapter.set(this.store, id, updated);
    return updated;
  }

  delete(id: string): Promise<void> {
    return this.adapter.delete(this.store, id);
  }

  clear(): Promise<void> {
    return this.adapter.clear(this.store);
  }

  async bulkCreate(entities: T[]): Promise<void> {
    await Promise.all(entities.map((e) => this.adapter.set(this.store, e.id, e)));
  }

  async replaceAll(entities: T[]): Promise<void> {
    await this.adapter.clear(this.store);
    await this.bulkCreate(entities);
  }
}
