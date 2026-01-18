import { tagsApi, type Tag } from "$lib/api";

let tags = $state<Tag[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

export function getTagsStore() {
  return {
    get tags() {
      return tags;
    },
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },

    async fetch() {
      loading = true;
      error = null;
      try {
        tags = await tagsApi.getAll();
      } catch (e) {
        error = e instanceof Error ? e.message : "Failed to fetch tags";
      } finally {
        loading = false;
      }
    },

    async create(name: string) {
      try {
        const tag = await tagsApi.create(name);
        tags = [...tags, tag].sort((a, b) => a.name.localeCompare(b.name));
        return tag;
      } catch (e) {
        error = e instanceof Error ? e.message : "Failed to create tag";
        throw e;
      }
    },

    async update(id: number, name: string) {
      try {
        const tag = await tagsApi.update(id, name);
        tags = tags
          .map((t) => (t.id === id ? tag : t))
          .sort((a, b) => a.name.localeCompare(b.name));
        return tag;
      } catch (e) {
        error = e instanceof Error ? e.message : "Failed to update tag";
        throw e;
      }
    },

    async delete(id: number) {
      try {
        await tagsApi.delete(id);
        tags = tags.filter((t) => t.id !== id);
      } catch (e) {
        error = e instanceof Error ? e.message : "Failed to delete tag";
        throw e;
      }
    },
  };
}

export const tagsStore = getTagsStore();
