import { Button, Drawer, Input, message, Space } from "antd";
import { useState } from "react";
import { getPlanItem, updatePlanItem } from "../api/backend";

export const formatVisitTime = (value) => {
  if (!value) return "未安排时间";
  return value.slice(0, 5);
};

const EditVisitTimeButton = ({ tripId, planItem, onSaved }) => {
  const [visible, setVisible] = useState(false);
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  const original = planItem.scheduledTime;

  const onOpen = () => {
    setTime(original?.slice(0, 5) ?? "");
    setVisible(true);
  };

  const onSave = () => {
    if (saving) return;

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      message.error("请选择有效的访问时间");
      return;
    }

    const scheduledTime = time;

    let submitted = false;
    setSaving(true);

    updatePlanItem(tripId, planItem.dayId, planItem, { scheduledTime })
      .then(() => {
        submitted = true;
        return getPlanItem(tripId, planItem.dayId, planItem.id);
      })
      .then((updatedItem) => {
        onSaved(updatedItem);
        message.success("访问时间已保存并重新读取");
        setVisible(false);
      })
      .catch((error) => {
        message.error(
          submitted
            ? "修改已提交，但重新读取失败。请重试或重新加载行程。"
            : error.message
        );
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <>
      <Button onClick={onOpen} disabled={!original}>
        修改时间
      </Button>

      <Drawer
        title="修改访问时间"
        open={visible}
        onClose={() => {
          if (!saving) setVisible(false);
        }}
        closable={!saving}
        maskClosable={!saving}
        keyboard={!saving}
        width={360}
        footer={
          <Space>
            <Button onClick={() => setVisible(false)} disabled={saving}>
              取消
            </Button>

            <Button type="primary" onClick={onSave} loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <p>{planItem.poi?.name}</p>
        <p>当前安排：{formatVisitTime(original)}</p>

        <label htmlFor={"visit-time-" + planItem.id}>新的访问时间</label>

        <Input
          id={"visit-time-" + planItem.id}
          type="time"
          step={60}
          value={time}
          disabled={saving}
          onChange={(event) => setTime(event.target.value)}
        />
      </Drawer>
    </>
  );
};

export default EditVisitTimeButton;
