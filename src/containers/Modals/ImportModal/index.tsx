import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Group, Button, TextInput, Stack, Paper, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import { AiOutlineUpload } from "react-icons/ai";
import type { FileFormat } from "src/enums/file.enum";
import useFile from "src/store/useFile";

export const ImportModal = ({ opened, onClose }: ModalProps) => {
  const [url, setURL] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);

  const setContents = useFile(state => state.setContents);
  const setFormat = useFile(state => state.setFormat);

  const handleImportFile = () => {
    if (url) {
      setFile(null);

      toast.loading("Loading...", { id: "toastFetch" });
      gaEvent("fetch_url");

      return fetch(url)
        .then(res => res.json())
        .then(json => {
          setContents({ contents: JSON.stringify(json, null, 2) });
          onClose();
        })
        .catch(() => toast.error("Failed to fetch JSON!"))
        .finally(() => toast.dismiss("toastFetch"));
    } else if (file) {
      const lastIndex = file.name.lastIndexOf(".");
      const format = file.name.substring(lastIndex + 1);
      setFormat(format as FileFormat);

      file.text().then(text => {
        setContents({ contents: text });
        setFile(null);
        setURL("");
        onClose();
      });

      gaEvent("import_file", { label: format });
    }
  };

  return (
    <Modal
      title="上传文件"
      opened={opened}
      onClose={() => {
        setFile(null);
        setURL("");
        onClose();
      }}
      centered
    >
      <Stack py="sm">
        <TextInput
          value={url}
          onChange={e => setURL(e.target.value)}
          type="url"
          placeholder="要获取的 json 的 URL"
          data-autofocus
        />
        <Paper radius="md" style={{ cursor: "pointer" }}>
          <Dropzone
            onDrop={files => setFile(files[0])}
            onReject={files => toast.error(`无法加载文件 ${files[0].file.name}`)}
            maxSize={500 * 1024}
            maxFiles={1}
            p="md"
            accept={[
              "application/json",
              "application/x-yaml",
              "text/csv",
              "application/xml",
              "application/toml",
            ]}
          >
            <Stack justify="center" align="center" gap="sm" mih={220}>
              <AiOutlineUpload size={48} />
              <Text fw="bold">拖拽文件到此处或者点击上传文件</Text>
              <Text c="dimmed" fz="xs">
                (最大不超过 500 Kb)
              </Text>
              <Text c="dimmed" fz="sm">
                {file?.name ?? "None"}
              </Text>
            </Stack>
          </Dropzone>
        </Paper>
      </Stack>
      <Group justify="right">
        <Button onClick={handleImportFile} disabled={!(file || url)}>
          导入
        </Button>
      </Group>
    </Modal>
  );
};
