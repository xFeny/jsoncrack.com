import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import useGraph from "src/containers/Editor/components/views/GraphView/stores/useGraph";
import useModal from "src/store/useModal";

const dataToString = (data: any) => {
  const text = Array.isArray(data) ? Object.fromEntries(data) : data;
  const replacer = (_: string, v: string) => {
    if (typeof v === "string") return v.replaceAll('"', "");
    return v;
  };

  return JSON.stringify(text, replacer, 2);
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => dataToString(state.selectedNode?.text));
  const path = useGraph(state => state.selectedNode?.path || "");

  return (
    <Modal title="节点内容" size="auto" opened={opened} onClose={onClose} centered>
      <Stack py="sm" gap="sm">
        <Stack gap="xs">
          <Text fz="xs" fw={500}>
            内容
          </Text>
          <ScrollArea.Autosize mah={250} maw={600}>
            <CodeHighlight
              code={nodeData}
              miw={350}
              maw={600}
              language="json"
              copyLabel="复制"
              copiedLabel="复制成功"
              withCopyButton
            />
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          节点路径
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={path}
            miw={350}
            mah={250}
            language="json"
            copyLabel="复制"
            copiedLabel="复制成功"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
