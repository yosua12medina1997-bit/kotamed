
do $$
declare pa uuid; pb uuid; z uuid;
begin
  select id into pa from public.ward_pavilions where code='A';
  select id into pb from public.ward_pavilions where code='B';

  delete from public.ward_beds where zone_id in (select id from public.ward_zones where pavilion_id in (pa,pb));
  delete from public.ward_zones where pavilion_id in (pa,pb);

  -- Pabellón A
  insert into public.ward_zones (pavilion_id,label,kind,col,row_index,col_span,row_span,sort_order) values
    (pa,'NUTRICIÓN','service',1,1,1,1,1),
    (pa,'SSHH','service',3,1,1,1,3),
    (pa,'PASADIZO AL STAR MÉDICO Y JEFATURA','circulation',4,1,1,2,4),
    (pa,'STAR ENFERMERÍA','service',5,1,1,1,5),
    (pa,'ENTRADA PRINCIPAL','entrance',1,2,1,1,6),
    (pa,'PASADIZO','circulation',2,2,2,1,7);

  insert into public.ward_zones (pavilion_id,label,kind,col,row_index,col_span,row_span,sort_order)
    values (pa,'SALA IM LEYLA · SUPERIOR','room',2,1,1,1,2) returning id into z;
  insert into public.ward_beds (zone_id,number,sort_order) values (z,'8',1),(z,'33',2),(z,'15',3);

  insert into public.ward_zones (pavilion_id,label,kind,col,row_index,col_span,row_span,sort_order)
    values (pa,'SALA INFERIOR IZQUIERDA','room',1,3,1,1,8) returning id into z;

  insert into public.ward_zones (pavilion_id,label,kind,col,row_index,col_span,row_span,sort_order)
    values (pa,'SALA IM LEYLA · INFERIOR','room',2,3,2,1,9) returning id into z;
  insert into public.ward_beds (zone_id,number,sort_order) values (z,'3',1);

  insert into public.ward_zones (pavilion_id,label,kind,col,row_index,col_span,row_span,sort_order)
    values (pa,'SALA IM DAMARIS','room',4,3,2,1,10) returning id into z;
  insert into public.ward_beds (zone_id,number,sort_order) values (z,'19',1),(z,'20',2),(z,'1',3),(z,'14',4);

  -- Pabellón B
  insert into public.ward_zones (pavilion_id,label,kind,col,row_index,col_span,row_span,sort_order) values
    (pb,'STAR ENFERMERÍA','service',1,1,1,1,1),
    (pb,'SSHH','service',2,1,1,1,2),
    (pb,'PASADIZO','circulation',1,2,5,1,6),
    (pb,'ENTRADA AUDITORIO','entrance',5,2,1,1,7);

  insert into public.ward_zones (pavilion_id,label,kind,col,row_index,col_span,row_span,sort_order)
    values (pb,'SALA IM KELLY','room',3,1,1,1,3) returning id into z;
  insert into public.ward_beds (zone_id,number,sort_order) values (z,'2',1),(z,'9',2),(z,'22',3);

  insert into public.ward_zones (pavilion_id,label,kind,col,row_index,col_span,row_span,sort_order)
    values (pb,'SALA SUPERIOR DERECHA','room',4,1,2,1,4) returning id into z;

  insert into public.ward_zones (pavilion_id,label,kind,col,row_index,col_span,row_span,sort_order)
    values (pb,'SALA IM VERLIN','room',1,3,2,1,8) returning id into z;
  insert into public.ward_beds (zone_id,number,sort_order) values (z,'31',1),(z,'23',2),(z,'21',3);

  insert into public.ward_zones (pavilion_id,label,kind,col,row_index,col_span,row_span,sort_order)
    values (pb,'SALA IM AILEN','room',3,3,2,1,9) returning id into z;
  insert into public.ward_beds (zone_id,number,sort_order) values (z,'32',1),(z,'36',2);

  insert into public.ward_zones (pavilion_id,label,kind,col,row_index,col_span,row_span,sort_order)
    values (pb,'SALA INFERIOR DERECHA','room',5,3,1,1,10) returning id into z;
end $$;
