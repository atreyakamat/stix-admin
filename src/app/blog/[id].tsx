import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { ImagesEditor } from "@/components/images-editor";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { copy } from "@/lib/contact";
import { confirm, useApi, useChange } from "@/lib/queries";
import type { PostRes } from "@/lib/responses";
import { toSlug } from "@/lib/slug";
import type { BlogPost, PostStatus } from "@/shared/types";
import { Button, ErrorView, Field, Gap, Loading, Screen, Segmented, T } from "@/ui/kit";
import { space } from "@/ui/theme";

type Form = { title: string; slug: string; excerpt: string; body: string; cover: string; tags: string; status: PostStatus };
const toForm = (p?: BlogPost): Form => ({ title: p?.title ?? "", slug: p?.slug ?? "", excerpt: p?.excerpt ?? "", body: p?.body ?? "", cover: p?.cover ?? "", tags: p?.tags.join(", ") ?? "", status: p?.status ?? "draft" });

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const q = useApi<PostRes>(isNew ? null : `blog/${id}`);
  if (!isNew && q.isPending) return <Loading />;
  if (!isNew && q.isError) return <ErrorView error={q.error} onRetry={q.refetch} />;
  return <PostForm key={id} id={id} post={isNew ? undefined : q.data!.post} />;
}

function PostForm({ id, post }: { id: string; post?: BlogPost }) {
  const isNew = !post;
  const { session } = useAuth();
  const [f, setF] = useState<Form>(() => toForm(post));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const save = useChange((form: Form) => (isNew ? api.post("blog", form) : api.put(`blog/${id}`, form)), ["blog"], {
    onDone: (r) => isNew && r.id && router.replace({ pathname: "/blog/[id]", params: { id: r.id } }),
  });
  const remove = useChange(() => api.del(`blog/${id}`), ["blog"], { onDone: () => router.back() });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));
  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? "New post" : "Edit post" }} />
      <View style={{ gap: space.l }}>
        <Segmented
          value={f.status}
          options={[
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
          ]}
          onChange={(v) => set("status", v)}
        />
        <Field label="Title" value={f.title} onChangeText={(v) => setF((cur) => ({ ...cur, title: v, slug: slugTouched ? cur.slug : toSlug(v) }))} />
        <Field label="Link name" value={f.slug} onChangeText={(v) => (setSlugTouched(true), set("slug", v))} autoCapitalize="none" hint={`/blog/${f.slug || "…"}`} />
        <Field label="Short summary" value={f.excerpt} onChangeText={(v) => set("excerpt", v)} multiline hint="Shown on the blog list and in link previews" />
        <View style={{ gap: space.s }}>
          <T.Mute>Cover photo</T.Mute>
          <ImagesEditor images={f.cover ? [f.cover] : []} onChange={(v) => set("cover", v[0] ?? "")} max={1} />
        </View>
        <Field label="Post" value={f.body} onChangeText={(v) => set("body", v)} multiline style={{ minHeight: 280 }} hint="Markdown: # heading, **bold**, - list, [link](https://…), ![photo](https://…)" />
        <Field label="Tags" value={f.tags} onChangeText={(v) => set("tags", v)} autoCapitalize="none" placeholder="stalls, goa, new drops" />
      </View>
      <Gap h={space.xl} />
      <Button label={f.status === "published" ? "Save and publish" : "Save draft"} icon="save" busy={save.isPending} onPress={() => save.mutate(f)} />
      {!isNew && (
        <View style={{ gap: space.m, marginTop: space.xl }}>
          {f.status === "published" ? <Button label="Copy post link" kind="secondary" icon="link" onPress={() => copy(`${session?.shopUrl}/blog/${f.slug}`, "Link copied")} /> : null}
          <Button label="Delete post" kind="danger" icon="trash-2" busy={remove.isPending} onPress={() => confirm("Delete this post?", f.title, "Delete", () => remove.mutate(undefined))} />
        </View>
      )}
    </Screen>
  );
}
