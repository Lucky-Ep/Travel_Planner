import ModulePlaceholder from './ModulePlaceholder';

export default function ExplorePage() {
  return (
    <ModulePlaceholder
      module="2"
      title="POI Management"
      todos={[
        'POI 搜索 / 关键词查询',
        '类别 / 评分筛选',
        '搜索结果列表 + POI 详情',
        '选择 POI 并加入指定 Trip / Day',
      ]}
    />
  );
}
