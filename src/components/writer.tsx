"use client";

import { useArtifact } from "./thread/artifact";

export function Writer(props: {
  title?: string;
  content?: string;
  description?: string;
}) {

  const [Artifact, { open, setOpen }] = useArtifact();

  return (
    <>
      <div
        onClick={() => setOpen(!open)}
        className="cursor-pointer rounded-lg border p-4"
      >
        <p className="font-medium">{props.title}</p>
        <p className="text-sm text-gray-500">{props.description}</p>
      </div>

      <Artifact title={props.title}>
        {props.content}
      </Artifact>
    </>
  );
}


