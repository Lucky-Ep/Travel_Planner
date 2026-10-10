import { Button, Popconfirm, message } from "antd";
import { useState } from "react";
import { deletePlanItem } from "../api/backend";

const DeletePlanItemButton = ({ tripId, dayId, planItemId, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);

  const onDelete = () => {
    if (deleting) return;

    setDeleting(true);

    return deletePlanItem(tripId, dayId, planItemId)
      .then(() => {
        onDeleted(planItemId);
        message.success("访问安排已删除");
      })
      .catch((error) => {
        message.error(error.message);
      })
      .finally(() => {
        setDeleting(false);
      });
  };

  return (
    <Popconfirm
      title="确定删除这条访问安排吗？"
      onConfirm={onDelete}
      okText="删除"
      cancelText="取消"
      okButtonProps={{ danger: true, loading: deleting }}
      cancelButtonProps={{ disabled: deleting }}
    >
      <Button danger loading={deleting} disabled={deleting}>
        删除
      </Button>
    </Popconfirm>
  );
};

export default DeletePlanItemButton;
