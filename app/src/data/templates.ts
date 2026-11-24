export type TemplateField = { key: string; label: string };

export type DocumentTemplate = {
  id: string;
  title: string;
  fields: TemplateField[];
  body: string; // يستخدم {{key}} كعناصر نائبة
};

// قوالب عامة تحتاج مراجعة محامٍ مرخّص قبل الاستخدام.
export const templates: DocumentTemplate[] = [
  {
    id: 'rent',
    title: 'عقد إيجار',
    fields: [
      { key: 'landlord', label: 'اسم المؤجر' },
      { key: 'tenant', label: 'اسم المستأجر' },
      { key: 'property', label: 'وصف العقار' },
      { key: 'rent', label: 'قيمة الإيجار الشهري' },
      { key: 'start', label: 'تاريخ بداية العقد' },
      { key: 'months', label: 'مدة العقد بالأشهر' },
    ],
    body: `عقد إيجار

أُبرم هذا العقد في تاريخ {{start}} بين:
الطرف الأول (المؤجر): {{landlord}}
الطرف الثاني (المستأجر): {{tenant}}

البند الأول: يؤجر المؤجر للمستأجر العقار الموصوف: {{property}}.
البند الثاني: مدة العقد {{months}} شهراً تبدأ من {{start}}.
البند الثالث: قيمة الإيجار الشهري {{rent}} يُدفع مقدماً في أول كل شهر.
البند الرابع: يلتزم المستأجر بالمحافظة على العين المؤجرة وردّها عند انتهاء العقد.

الطرف الأول: ____________        الطرف الثاني: ____________`,
  },
  {
    id: 'employment',
    title: 'عقد عمل',
    fields: [
      { key: 'employer', label: 'اسم صاحب العمل' },
      { key: 'employee', label: 'اسم الموظف' },
      { key: 'job', label: 'المسمى الوظيفي' },
      { key: 'salary', label: 'الراتب الشهري' },
      { key: 'start', label: 'تاريخ المباشرة' },
    ],
    body: `عقد عمل

بين صاحب العمل: {{employer}}
والموظف: {{employee}}

البند الأول: يعمل الموظف بوظيفة {{job}} ابتداءً من {{start}}.
البند الثاني: يصرف لدى الموظف راتب شهري قدره {{salary}}.
البند الثالث: تخضع علاقة العمل لأحكام نظام العمل المعمول به.

صاحب العمل: ____________        الموظف: ____________`,
  },
  {
    id: 'nda',
    title: 'اتفاقية عدم إفشاء',
    fields: [
      { key: 'discloser', label: 'الطرف المفصِح' },
      { key: 'receiver', label: 'الطرف المستلِم' },
      { key: 'purpose', label: 'الغرض من المعلومات' },
      { key: 'years', label: 'مدة السرية بالسنوات' },
    ],
    body: `اتفاقية عدم إفشاء

الطرف المفصِح: {{discloser}}
الطرف المستلِم: {{receiver}}

البند الأول: يلتزم الطرف المستلِم بعدم إفشاء أي معلومات سرية تخص الغرض: {{purpose}}.
البند الثاني: تسري هذه الالتزامات لمدة {{years}} سنوات من تاريخ التوقيع.

الطرف المفصِح: ____________        الطرف المستلِم: ____________`,
  },
  {
    id: 'poa',
    title: 'توكيل عام',
    fields: [
      { key: 'principal', label: 'اسم الموكِّل' },
      { key: 'agent', label: 'اسم الوكيل' },
      { key: 'scope', label: 'نطاق الوكالة' },
    ],
    body: `توكيل عام

أنا الموقّع أدناه {{principal}} أوكّل السيد/ة {{agent}} بالوكالة عني في: {{scope}}.
ويحق للوكيل مراجعة الجهات الحكومية والقضائية وتقديم ما يلزم نيابة عني.

توقيع الموكِّل: ____________`,
  },
  {
    id: 'notice',
    title: 'إنذار رسمي',
    fields: [
      { key: 'sender', label: 'اسم المُنذِر' },
      { key: 'recipient', label: 'اسم المُنذَر' },
      { key: 'subject', label: 'موضوع الإنذار' },
      { key: 'deadline', label: 'المهلة المحددة للتنفيذ' },
    ],
    body: `إنذار رسمي

إلى السيد/ة: {{recipient}}
من: {{sender}}

بناءً على ما سبق، نُنذركم بضرورة: {{subject}}.
وذلك خلال مهلة قدرها {{deadline}} من تاريخ استلام هذا الإنذار، وإلا سنتخذ الإجراءات النظامية اللازمة دون إنذار آخر.`,
  },
];

export function fillTemplate(template: DocumentTemplate, values: Record<string, string>): string {
  return template.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = values[key]?.trim();
    return v ? v : '______';
  });
}
