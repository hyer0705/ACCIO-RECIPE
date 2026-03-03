'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';

// URL 검증 스키마
// youtube, youtu.be, blog.naver.com 등을 허용하는 정규식 작성 (필요에 따라 더 확장 가능)
const urlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|blog\.naver\.com)\/.+$/;

const formSchema = z.object({
  url: z
    .string()
    .min(1, { message: 'URL을 입력해주세요.' })
    .regex(urlRegex, { message: '제대로된 URL을 입력해달라고 합니다.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface RecipeUrlFormProps {
  onSubmitUrl: (url: string) => void;
  isPending?: boolean;
}

export default function RecipeUrlForm({ onSubmitUrl, isPending = false }: RecipeUrlFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
    },
  });

  const onSubmit = (data: FormValues) => {
    onSubmitUrl(data.url);
  };

  return (
    <div className="flex flex-col items-center justify-center pt-24 pb-16 w-full text-center">
      <h1
        className="text-4xl md:text-5xl font-extrabold text-[#3C2D23] mb-4 
        tracking-tight"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        어떤 요리를 시작할까요?
      </h1>
      <p className="text-sm md:text-base text-[#7c695c] mb-12">
        유튜브나 블로그의 레시피 주소를 붙여넣어 보세요.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-2xl relative">
        <div className="relative flex flex-col items-center w-full">
          <Input
            {...register('url')}
            type="text"
            placeholder="https://www.youtube.com/..."
            className="w-full h-16 pl-6 pr-36 rounded-full border border-gray-200 text-lg text-[#3C2D23] 
                       bg-white focus-visible:ring-2 focus-visible:ring-[#FF5A28]/50 placeholder:text-gray-400
                       shadow-none outline-none"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={isPending}
            className="absolute right-2 top-2 bottom-2 rounded-full bg-[#FF5A28] hover:bg-[#ff460f] 
                       text-white font-bold px-6 transition-colors shadow-none disabled:bg-opacity-70 disabled:cursor-not-allowed"
          >
            {isPending ? '분석 중...' : '레시피 분석'}
          </button>
        </div>

        {/* 에러 메시지 렌더링 */}
        {errors.url && (
          <p className="text-red-500 font-medium text-sm mt-3 absolute left-6 -bottom-8">
            {errors.url.message}
          </p>
        )}
      </form>
    </div>
  );
}
