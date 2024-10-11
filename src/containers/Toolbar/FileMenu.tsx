import React from "react";
import { Flex, Menu } from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import { CgChevronDown } from "react-icons/cg";
import useFile from "src/store/useFile";
import useModal from "src/store/useModal";
import { StyledToolElement } from "./styles";

export const FileMenu = () => {
  const setVisible = useModal(state => state.setVisible);
  const getContents = useFile(state => state.getContents);
  const getFormat = useFile(state => state.getFormat);

  const handleSave = () => {
    const a = document.createElement("a");
    const file = new Blob([getContents()], { type: "text/plain" });

    a.href = window.URL.createObjectURL(file);
    a.download = `jsoncrack.${getFormat()}`;
    a.click();

    gaEvent("save_file", { label: getFormat() });
  };

  return (
    <Menu shadow="md" withArrow>
      <Menu.Target>
        <StyledToolElement title="文件">
          <Flex align="center" gap={3}>
            文件
            <CgChevronDown />
          </Flex>
        </StyledToolElement>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item fz={12} onClick={() => setVisible("import")(true)}>
          导入
        </Menu.Item>
        <Menu.Item fz={12} onClick={handleSave}>
          导出
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
