import { useParams } from 'react-router-dom';
import ModulePlaceholder from './ModulePlaceholder';

export default function TripDetailPage() {
  const { tripId } = useParams();

  return (
    <ModulePlaceholder
      module="3 + 4"
      title={tripId === 'new' ? '创建 Trip' : `Trip 详情 #${tripId}`}
      todos={[
        '创建 / 编辑 Trip、Day 管理',
        '显示每日计划，添加 / 删除 PlanItem',
        '拖拽排序、修改访问时间、设置提醒',
        'Google Map + POI Marker + 当天路线 Polyline（模块 4）',
      ]}
    />
  );
}
