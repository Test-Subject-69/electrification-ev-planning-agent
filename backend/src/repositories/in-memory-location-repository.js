export class InMemoryLocationRepository {
  mode = "memory";

  #locations = new Map();

  async list() {
    return Array.from(this.#locations.values()).sort((left, right) => {
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
  }

  async replaceAll(locations) {
    this.#locations.clear();
    for (const location of locations) {
      this.#locations.set(location.id, location);
    }

    return this.list();
  }

  async upsertMany(locations) {
    for (const location of locations) {
      this.#locations.set(location.id, location);
    }

    return this.list();
  }
}
