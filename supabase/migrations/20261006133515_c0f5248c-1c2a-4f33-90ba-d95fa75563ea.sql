-- As medidas de embalagem vieram do Bling multiplicadas por 100 porque a flag
-- unidadeMedida do cadastro estava marcada como "metros" quando os números já
-- estavam em centímetros (ex.: 18, 51, 110). Devolver os valores reais em cm.
UPDATE public.products SET package_height_cm = package_height_cm / 100 WHERE package_height_cm >= 1000;
UPDATE public.products SET package_width_cm = package_width_cm / 100 WHERE package_width_cm >= 1000;
UPDATE public.products SET package_length_cm = package_length_cm / 100 WHERE package_length_cm >= 1000;