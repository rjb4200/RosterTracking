-- One-off seed of the initial Mobile Training Unit catalog. Inserts only when
-- the catalog is empty so a later deploy never overwrites staff edits.
-- Equipment carries no quantity rule; supplies carry per-class + per-student
-- quantities with a rounding mode and unit label.
INSERT INTO "mtu_catalog_items" (
	"kind",
	"name",
	"unit_label",
	"per_class_qty",
	"per_student_qty",
	"rounding",
	"sort_order"
)
SELECT
	v."kind",
	v."name",
	v."unit_label",
	v."per_class_qty",
	v."per_student_qty",
	v."rounding",
	v."sort_order"
FROM (
	VALUES
		('equipment', 'Adult HAL s5301 Mannequin', NULL, NULL, NULL, NULL, 1),
		('equipment', 'Victoria OB/Birthing trainer', NULL, NULL, NULL, NULL, 2),
		('equipment', 'Advanced pediatric HAL', NULL, NULL, NULL, NULL, 3),
		('equipment', 'Portable virtual monitor', NULL, NULL, NULL, NULL, 4),
		('equipment', 'Gaumard Ultrasound module', NULL, NULL, NULL, NULL, 5),
		('equipment', 'Gaumard POCUS/EFAST unit', NULL, NULL, NULL, NULL, 6),
		('equipment', 'Pediatric ultrasound POCUS/EFAST', NULL, NULL, NULL, NULL, 7),
		('equipment', 'Ultrasound Cases', NULL, NULL, NULL, NULL, 8),
		('equipment', 'Laryngoscope Set', NULL, NULL, NULL, NULL, 9),
		('equipment', 'Traction Splints', NULL, NULL, NULL, NULL, 10),
		('equipment', 'I.O. Drill', NULL, NULL, NULL, NULL, 11),
		('equipment', 'Naloxone Trainer', NULL, NULL, NULL, NULL, 12),
		('equipment', 'Tourniquet Trainer', NULL, NULL, NULL, NULL, 13),
		('equipment', 'SAM junctional tourniquet Trainer', NULL, NULL, NULL, NULL, 14),
		('equipment', 'Epi-pen trainer', NULL, NULL, NULL, NULL, 15),
		('equipment', 'Suction unit', NULL, NULL, NULL, NULL, 16),
		('equipment', 'Traffic Cones', NULL, NULL, NULL, NULL, 17),
		('equipment', 'Ford Transit Van 15 passenger', NULL, NULL, NULL, NULL, 18),
		('supplies', 'Trauma Moulage Kit', 'each', 1, 0, 'ceil', 1),
		('supplies', 'True Clot Hemorrhage training kit', 'each', 1, 0, 'ceil', 2),
		('supplies', 'TCC/TECC training module: 2 IFAKs', 'each', 0, 0.5, 'ceil', 3),
		('supplies', 'Tourniquet', 'each', 0, 1, 'ceil', 4),
		('supplies', 'Simulated blood gallon', 'gallon', 0, 0.25, 'exact', 5),
		('supplies', 'Roller Gauze', 'each', 0, 2, 'ceil', 6),
		('supplies', 'Chest Seal', 'each', 0, 1, 'ceil', 7)
) AS v (
	"kind",
	"name",
	"unit_label",
	"per_class_qty",
	"per_student_qty",
	"rounding",
	"sort_order"
)
WHERE NOT EXISTS (SELECT 1 FROM "mtu_catalog_items");
