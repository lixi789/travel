-- Run after schema.sql to load the current checklist.

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000001','美国','🇺🇸',10) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','冰川国家公园','国家公园',true,'Hidden Lake · Highline · Grinnell Glacier',10) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','纪念碑谷','自然景观',true,null,20) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','Zion 国家公园','国家公园',true,null,30) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','峡谷地国家公园','国家公园',true,null,40) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','拱门国家公园','国家公园',true,null,50) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001','黄石国家公园','国家公园',true,null,60) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000001','大提顿国家公园','国家公园',true,null,70) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000001','Bryce 国家公园','国家公园',true,null,80) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000001','大峡谷国家公园','国家公园',true,null,90) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000001','Muir Woods · Dipsea','徒步路线',true,null,100) on conflict (id) do nothing;

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000002','加拿大','🇨🇦',20) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000002','班夫国家公园','国家公园',false,null,10) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000002','Jasper 国家公园','国家公园',false,null,20) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000002','幽鹤国家公园','国家公园',false,null,30) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000014','10000000-0000-0000-0000-000000000002','Waterton Lake 国家公园','国家公园',false,null,40) on conflict (id) do nothing;

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000003','格鲁吉亚','🇬🇪',30) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000015','10000000-0000-0000-0000-000000000003','第比利斯','城市',false,null,10) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000016','10000000-0000-0000-0000-000000000003','梅斯蒂亚','城市 / 徒步',false,null,20) on conflict (id) do nothing;

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000004','尼泊尔','🇳🇵',40) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000017','10000000-0000-0000-0000-000000000004','安纳普尔那','徒步路线',false,null,10) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000018','10000000-0000-0000-0000-000000000004','布恩山','徒步路线',false,null,20) on conflict (id) do nothing;

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000005','法国 · 瑞士 · 意大利','🇫🇷 🇨🇭 🇮🇹',50) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000019','10000000-0000-0000-0000-000000000005','环勃朗峰','徒步路线',false,null,10) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000020','10000000-0000-0000-0000-000000000005','多洛米蒂','徒步区域',false,null,20) on conflict (id) do nothing;

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000006','西班牙','🇪🇸',60) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000021','10000000-0000-0000-0000-000000000006','朝圣之路','徒步路线',false,null,10) on conflict (id) do nothing;

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000007','日本','🇯🇵',70) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000022','10000000-0000-0000-0000-000000000007','熊野古道','徒步路线',false,null,10) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000023','10000000-0000-0000-0000-000000000007','日本阿尔卑斯','徒步区域',false,null,20) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000024','10000000-0000-0000-0000-000000000007','富士山','登山',false,null,30) on conflict (id) do nothing;

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000008','坦桑尼亚','🇹🇿',80) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000025','10000000-0000-0000-0000-000000000008','乞力马扎罗','登山',false,null,10) on conflict (id) do nothing;

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000009','香港','🇭🇰',90) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000026','10000000-0000-0000-0000-000000000009','麦理浩径','徒步路线',false,null,10) on conflict (id) do nothing;

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000010','挪威','🇳🇴',100) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000027','10000000-0000-0000-0000-000000000010','峡湾徒步','徒步区域',false,null,10) on conflict (id) do nothing;

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000011','冰岛','🇮🇸',110) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000028','10000000-0000-0000-0000-000000000011','兰曼线','徒步路线',false,null,10) on conflict (id) do nothing;

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000012','意大利','🇮🇹',120) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000029','10000000-0000-0000-0000-000000000012','佛罗伦萨','城市',false,null,10) on conflict (id) do nothing;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000030','10000000-0000-0000-0000-000000000012','威尼斯','城市',false,null,20) on conflict (id) do nothing;

insert into public.countries(id,name,flag,sort_order) values ('10000000-0000-0000-0000-000000000013','印度尼西亚','🇮🇩',130) on conflict (id) do update set name=excluded.name, flag=excluded.flag, sort_order=excluded.sort_order;
insert into public.places(id,country_id,name,kind,completed,route_text,sort_order) values ('20000000-0000-0000-0000-000000000031','10000000-0000-0000-0000-000000000013','龙目岛','海岛 / 徒步',false,null,10) on conflict (id) do nothing;
