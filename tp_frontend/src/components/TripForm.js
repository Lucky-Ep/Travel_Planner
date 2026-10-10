import { Alert, Button, Form, Input, Modal, message } from "antd";
import { useRef, useState } from "react";
import { createTrip, updateTrip } from "../api/backend";

const isDateString = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;

  const date = new Date(value + "T00:00:00Z");

  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

const dateRule = {
  validator: (_, value) =>
    !value || isDateString(value)
      ? Promise.resolve()
      : Promise.reject(new Error("请输入有效日期")),
};

const TripForm = ({ trip = null, days = [], onSaved }) => {
  const [form] = Form.useForm();

  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submitting = useRef(false);
  const editing = trip != null;

  const onOpen = () => {
    form.resetFields();

    form.setFieldsValue({
      name: trip?.name ?? "",
      city: trip?.city ?? "",
      countryCode: trip?.countryCode ?? "CN",
      startDate: trip?.startDate ?? "",
      endDate: trip?.endDate ?? "",
    });

    setError("");
    setVisible(true);
  };

  const onFinish = (values) => {
    if (submitting.current) return;

    const data = {
      name: values.name.trim(),
      city: values.city.trim(),
      countryCode: values.countryCode.trim().toUpperCase(),
      startDate: values.startDate,
      endDate: values.endDate,
    };

    if (
      editing &&
      days.some((day) => day.date < data.startDate || day.date > data.endDate)
    ) {
      setError("日期范围必须包含已有的所有 Day，请先处理范围外的 Day。");
      return;
    }

    submitting.current = true;
    setSaving(true);
    setError("");

    const request = editing
      ? updateTrip(trip.id, data).then(() => trip.id)
      : createTrip(data).then((createdTrip) => createdTrip.id);

    return request
      .then((tripId) => {
        setVisible(false);
        message.success(editing ? "行程已保存" : "行程已创建");
        onSaved(tripId);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        submitting.current = false;
        setSaving(false);
      });
  };

  return (
    <>
      <Button type={editing ? "default" : "primary"} onClick={onOpen}>
        {editing ? "编辑行程" : "创建行程"}
      </Button>

      <Modal
        title={editing ? "编辑行程" : "创建行程"}
        open={visible}
        forceRender
        onCancel={() => {
          if (!submitting.current) setVisible(false);
        }}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        cancelButtonProps={{ disabled: saving }}
        closable={!saving}
        maskClosable={!saving}
        keyboard={!saving}
      >
        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          name={editing ? "edit-trip-" + trip.id : "create-trip"}
          layout="vertical"
          onFinish={onFinish}
          disabled={saving}
        >
          <Form.Item
            label="行程名称"
            name="name"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "请输入行程名称",
              },
            ]}
          >
            <Input placeholder="例如：东京五日游" />
          </Form.Item>

          <Form.Item
            label="城市"
            name="city"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "请输入城市",
              },
            ]}
          >
            <Input placeholder="例如：Tokyo" />
          </Form.Item>

          <Form.Item
            label="国家代码（两位字母）"
            name="countryCode"
            rules={[
              { required: true, message: "请输入国家代码" },
              { pattern: /^[A-Za-z]{2}$/, message: "请输入两位字母，例如 CN" },
            ]}
          >
            <Input maxLength={2} placeholder="CN" />
          </Form.Item>

          <Form.Item
            label="开始日期"
            name="startDate"
            rules={[{ required: true, message: "请选择开始日期" }, dateRule]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item
            label="结束日期"
            name="endDate"
            dependencies={["startDate"]}
            rules={[
              { required: true, message: "请选择结束日期" },
              dateRule,
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const start = getFieldValue("startDate");

                  if (
                    !isDateString(start) ||
                    !isDateString(value) ||
                    value >= start
                  ) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error("结束日期不能早于开始日期"));
                },
              }),
            ]}
          >
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default TripForm;
