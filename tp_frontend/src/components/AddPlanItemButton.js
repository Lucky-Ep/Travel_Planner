import { Alert, Button, Drawer, Empty, Input, Select, Space, message } from "antd";
import { useEffect, useState } from "react";
import { createPlanItem, listPOIs } from "../api/backend";

const AddPlanItemButton = ({ tripId, city, day, nextVisitOrder, onCreated }) => {
  const [visible, setVisible] = useState(false);
  const [pois, setPois] = useState([]);
  const [poiId, setPoiId] = useState(null);
  const [time, setTime] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    setLoading(true);
    setError("");

    listPOIs(city)
      .then((data) => {
        if (!cancelled) setPois(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setPois([]);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, retry, city]);

  const onOpen = () => {
    setPoiId(null);
    setTime("");
    setPois([]);
    setError("");
    setLoading(true);
    setVisible(true);
  };

  const onCreate = () => {
    if (saving || loading || error) return;

    const poi = pois.find((item) => item.id === poiId);

    if (!poi) {
      message.error("请先选择一个景点");
      return;
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      message.error("请填写有效的访问时间");
      return;
    }

    setSaving(true);

    createPlanItem(tripId, day.id, {
      poiId: poi.id,
      visitOrder: nextVisitOrder,
      scheduledTime: time,
    })
      .then((createdItem) => {
        onCreated({ ...createdItem, poi });
        message.success("已添加到当天计划");
        setVisible(false);
      })
      .catch((err) => {
        message.error(err.message);
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <>
      <Button type="primary" onClick={onOpen}>
        添加安排
      </Button>

      <Drawer
        title={"添加安排 · " + day.date}
        open={visible}
        width={400}
        onClose={() => {
          if (!saving) setVisible(false);
        }}
        closable={!saving}
        maskClosable={!saving}
        keyboard={!saving}
        footer={
          <Space>
            <Button onClick={() => setVisible(false)} disabled={saving}>
              取消
            </Button>

            <Button
              type="primary"
              onClick={onCreate}
              loading={saving}
              disabled={loading || !!error || poiId == null || !time}
            >
              添加
            </Button>
          </Space>
        }
      >
        {error ? (
          <Alert
            type="error"
            message={error}
            action={
              <Button onClick={() => setRetry((v) => v + 1)}>重试</Button>
            }
          />
        ) : (
          <>
            <Select
              aria-label="选择景点"
              placeholder="选择景点"
              value={poiId}
              onChange={setPoiId}
              loading={loading}
              disabled={loading || saving}
              showSearch
              optionFilterProp="label"
              style={{ width: "100%" }}
              options={pois.map((poi) => ({
                value: poi.id,
                label: poi.name + " — " + poi.address,
              }))}
            />

            <label htmlFor={`new-visit-time-${day.id}`}>访问时间</label>
            <Input
              id={`new-visit-time-${day.id}`}
              type="time"
              value={time}
              disabled={loading || saving}
              onChange={(event) => setTime(event.target.value)}
              style={{ marginBottom: 12 }}
            />

            {!loading && pois.length === 0 && (
              <Empty description="暂无可选景点" />
            )}

            <p>当前可选择 {city} 的景点。</p>
          </>
        )}
      </Drawer>
    </>
  );
};

export default AddPlanItemButton;
