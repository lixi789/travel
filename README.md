# 山野清单 · 两人共享 Web App

这是一个专门为两个人使用的私人徒步 / 旅行共享相册。

## 这一版已经改好的内容

- 首页只保留原插画的 **最上方横幅** 和 **最下方两只狗看山的插画**。
- 中间不再使用整张长清单海报。
- 可以在 App 内新增、编辑、删除国家 / 地区。
- 可以在国家下面新增、编辑、删除徒步路线、公园、城市。
- 每个地点点进去是一页独立旅行相册：
  - 大图封面
  - 日期
  - 路线 / 行程
  - 一句话记录
  - 照片瀑布流
  - 设为封面
  - 打卡状态
- 日本项目已改为“日本阿尔卑斯”。
- 支持 Supabase 两个账号共享同一份内容。
- 支持 Supabase Realtime。
- 支持 iPhone PWA。
- 未填写 Supabase 配置时，会自动进入“本地预览模式”。

---

## 推荐架构

**Cloudflare Pages + Supabase + iPhone PWA** 很适合这个项目。

- Cloudflare Pages：网页静态文件
- Supabase Auth：两个人登录
- Supabase Postgres：国家、路线、日期、文字、打卡
- Supabase Storage：私人照片
- Supabase Realtime：两个人之间同步
- iPhone Safari：添加到主屏幕后像 App 一样打开

你不需要 App Store，也不需要家里的电脑一直开机。

---

## 1. 本地预览

在项目目录打开终端：

```bash
python3 -m http.server 8080
```

浏览器访问：

```text
http://localhost:8080
```

现在 `config.js` 默认是空的，所以会进入本地预览模式。

---

## 2. 建立 Supabase

新建 Supabase Project。

打开 SQL Editor，先执行：

```text
supabase/schema.sql
```

然后执行：

```text
supabase/seed.sql
```

这样会把当前徒步清单导进去。

---

## 3. 创建两位用户

Supabase Dashboard：

Authentication → Users → Add user

分别创建你们两个人的 Email + Password 用户。

复制两个 User UUID，然后运行：

```sql
insert into public.app_members(user_id,display_name) values
('第一个用户UUID','名字1'),
('第二个用户UUID','名字2');
```

建议随后关闭公开 Sign Up。

整个 App 的数据库和照片权限都由 `app_members` 白名单 + RLS 控制。

---

## 4. 连接前端

Supabase Project Settings → API：

复制：

- Project URL
- anon / publishable key

编辑 `config.js`：

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "你的 anon / publishable key"
};
```

**不要把 service_role key 放进网页。**

anon key 在浏览器中可见是正常的；真正的私密性由 RLS 控制。

---

## 5. Cloudflare Pages 发布

最方便的是 GitHub：

1. 把整个项目文件夹放到一个 GitHub repository。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages。
3. Connect to Git。
4. Framework preset：None。
5. Build command：留空。
6. Output directory：项目根目录。
7. Deploy。

这是纯静态网页，不需要 Node 构建。

也可以使用 Cloudflare Pages 的 Direct Upload。

---

## 6. iPhone 变成 App

部署成功得到 HTTPS 地址以后：

1. 用 iPhone Safari 打开网址。
2. 分享。
3. 添加到主屏幕。
4. 选择“作为 Web App”。
5. 桌面上会出现“山野清单”图标。

---

## 7. 两人共享方式

两个人分别用自己的账号登录。

两边会看到相同的：

- 国家
- 徒步路线
- 打卡
- 日期
- 路线描述
- 一句话
- 相册照片
- 地点封面

Realtime 已经在项目中接好。

---

## 8. 照片隐私

`trip-photos` 是 private bucket。

页面显示照片时使用临时 signed URL，而不是公开照片 URL。

这比 public bucket 更适合私人相册。

---

## 9. 自己电脑当服务器是否可以

可以，但不建议作为主服务器。

如果使用自己的电脑：

- 必须一直开机
- 不能休眠
- 外出要解决 HTTPS / 远程访问
- 家里断网或断电就无法打开
- 硬盘故障需要自己备份

比较理想的是：

**Supabase = 在线共享**

**你的电脑 / NAS = 原图长期备份**

之后可以再增加一个脚本，把 Supabase Storage 的照片自动同步到你的电脑。

---

## 文件结构

```text
index.html
styles.css
app.js
config.js
config.example.js
seed.json
manifest.webmanifest
sw.js
assets/
  top-banner.jpg
  bottom-banner.jpg
  icon-192.png
  icon-512.png
supabase/
  schema.sql
  seed.sql
```
