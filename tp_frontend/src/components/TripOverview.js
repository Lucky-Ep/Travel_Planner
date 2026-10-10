import {
  message,
  Card,
  Button,
  Select,
  Space,
  Typography,
  Empty,
  Spin,
  Timeline,
} from "antd";

import {
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { getDay, getPOI, getTrip, getPlanItem } from "../utils";

const TripOverview = ({ tripId, onClose }) => {
  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [planItems, setPlanItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  const { Title, Text } = Typography;

  useEffect(() => {
    setLoading(true);

    getTrip(tripId)
      .then((tripData) => {
        setTrip(tripData);
      })
      .catch((error) => {
        message.error(`Error fetching trip: ${error.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tripId]);

  useEffect(() => {
    if (!trip) {
      return;
    }

    Promise.all(trip.days.map((day) => getDay(day.id)))
      .then((daysData) => {
        setDays(daysData);
      })
      .catch((error) => {
        message.error(`Error fetching days: ${error.message}`);
      });
  }, [trip]);

  useEffect(() => {
    if (days.length === 0) {
      return;
    }

    Promise.all(
      days.flatMap((day) =>
        day.planItems.map((planItem) => getPlanItem(planItem.id)),
      ),
    )
      .then((planItemsData) => {
        Promise.all(planItemsData.map((planItem) => getPOI(planItem.poiId)))
          .then((poisData) => {
            const planItemsWithPOIs = planItemsData.map((planItem, index) => {
              const poi = poisData[index];
              return { ...planItem, poi };
            });
            setPlanItems(planItemsWithPOIs);
          })
          .catch((error) => {
            message.error(`Error fetching POIs: ${error.message}`);
          });
      })
      .catch((error) => {
        message.error(`Error fetching plan items: ${error.message}`);
      });
  }, [days]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: 80,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!trip) {
    return <div>No trip found.</div>;
  }

  if (days.length === 0) {
    return <div>No days found in this trip.</div>;
  }

  const currentDay = days[currentDayIndex];

  const currentDayPlanItems = currentDay
    ? planItems.filter((planItem) =>
        currentDay.planItems.some((item) => item.id === planItem.id),
      )
    : [];

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: "0 20px",
      }}
    >
      {/* Trip 总览卡片 */}
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* 顶部标题 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <Title level={2} style={{ margin: 0 }}>
                {trip.name}
              </Title>

              <Text type="secondary">
                <EnvironmentOutlined /> {trip.city}
              </Text>
            </div>
          </div>

          {/* Trip 选择 */}
          <div>
            <Text strong>Trip</Text>

            <Select
              value={trip.id}
              style={{
                width: "100%",
                marginTop: 8,
              }}
              options={[
                {
                  value: trip.id,
                  label: trip.name,
                },
              ]}
            />
          </div>

          {/* Day 导航 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Button
              shape="circle"
              icon={<LeftOutlined />}
              disabled={currentDayIndex === 0}
              onClick={() => setCurrentDayIndex((prev) => prev - 1)}
            />

            <div style={{ textAlign: "center" }}>
              <Title level={3} style={{ margin: 0 }}>
                Day {currentDayIndex + 1}
              </Title>

              <Text type="secondary">{currentDay.date}</Text>
            </div>

            <Button
              shape="circle"
              icon={<RightOutlined />}
              disabled={currentDayIndex === days.length - 1}
              onClick={() => setCurrentDayIndex((prev) => prev + 1)}
            />
          </div>

          {/* 当前 Day */}
          <Card
            title={`Day ${currentDayIndex + 1}`}
            extra={<Text type="secondary">{currentDay.date}</Text>}
          >
            {currentDayPlanItems.length === 0 ? (
              <Empty description="No plans for this day" />
            ) : (
              <Timeline
                mode="left"
                items={currentDayPlanItems.map((planItem) => ({
                  label: `${planItem.arrivalTime} - ${planItem.departureTime}`,
                  children: (
                    <div>
                      <h3>{planItem.poi?.name}</h3>
                      <p>{planItem.poi?.address}</p>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Space>
      </Card>
    </div>
  );
};

export default TripOverview;
