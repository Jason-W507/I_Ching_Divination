import requests
from bs4 import BeautifulSoup
import json
import time
import random # 用于随机延时

# 六十四卦基本数据 (与占卜程序中的 HEXAGRAM_DATA 结构一致)
# 用于生成URL和作为JSON文件的键
HEXAGRAM_BASE_DATA = {
    "111111": {"id": 1, "char": "䷀", "name_cn": "乾", "pinyin": "Qián"},
    "000000": {"id": 2, "char": "䷁", "name_cn": "坤", "pinyin": "Kūn"},
    "100010": {"id": 3, "char": "䷂", "name_cn": "屯", "pinyin": "Zhūn"},
    "010001": {"id": 4, "char": "䷃", "name_cn": "蒙", "pinyin": "Méng"},
    "010111": {"id": 5, "char": "䷄", "name_cn": "需", "pinyin": "Xū"},
    "111010": {"id": 6, "char": "䷅", "name_cn": "訟", "pinyin": "Sòng"},
    "000010": {"id": 7, "char": "䷆", "name_cn": "師", "pinyin": "Shī"},
    "010000": {"id": 8, "char": "䷇", "name_cn": "比", "pinyin": "Bǐ"},
    "110111": {"id": 9, "char": "䷈", "name_cn": "小畜", "pinyin": "Xiǎo Xù"},
    "111011": {"id": 10, "char": "䷉", "name_cn": "履", "pinyin": "Lǚ"},
    "000111": {"id": 11, "char": "䷊", "name_cn": "泰", "pinyin": "Tài"},
    "111000": {"id": 12, "char": "䷋", "name_cn": "否", "pinyin": "Pǐ"},
    "111101": {"id": 13, "char": "䷌", "name_cn": "同人", "pinyin": "Tóng Rén"},
    "101111": {"id": 14, "char": "䷍", "name_cn": "大有", "pinyin": "Dà Yǒu"},
    "000001": {"id": 15, "char": "䷎", "name_cn": "謙", "pinyin": "Qiān"},
    "100000": {"id": 16, "char": "䷏", "name_cn": "豫", "pinyin": "Yù"},
    "011100": {"id": 17, "char": "䷐", "name_cn": "隨", "pinyin": "Suí"},
    "001110": {"id": 18, "char": "䷑", "name_cn": "蠱", "pinyin": "Gǔ"},
    "000011": {"id": 19, "char": "䷒", "name_cn": "臨", "pinyin": "Lín"},
    "110000": {"id": 20, "char": "䷓", "name_cn": "觀", "pinyin": "Guān"},
    "101100": {"id": 21, "char": "䷔", "name_cn": "噬嗑", "pinyin": "Shì Kè"},
    "001101": {"id": 22, "char": "䷕", "name_cn": "賁", "pinyin": "Bì"},
    "001000": {"id": 23, "char": "䷖", "name_cn": "剝", "pinyin": "Bō"},
    "000100": {"id": 24, "char": "䷗", "name_cn": "復", "pinyin": "Fù"},
    "111100": {"id": 25, "char": "䷘", "name_cn": "無妄", "pinyin": "Wú Wàng"},
    "001111": {"id": 26, "char": "䷙", "name_cn": "大畜", "pinyin": "Dà Xù"},
    "100001": {"id": 27, "char": "䷚", "name_cn": "頤", "pinyin": "Yí"},
    "011110": {"id": 28, "char": "䷛", "name_cn": "大過", "pinyin": "Dà Guò"},
    "010010": {"id": 29, "char": "䷜", "name_cn": "坎", "pinyin": "Kǎn"},
    "101101": {"id": 30, "char": "䷝", "name_cn": "離", "pinyin": "Lí"},
    "011001": {"id": 31, "char": "䷞", "name_cn": "咸", "pinyin": "Xián"},
    "100110": {"id": 32, "char": "䷟", "name_cn": "恆", "pinyin": "Héng"},
    "111001": {"id": 33, "char": "䷠", "name_cn": "遯", "pinyin": "Dùn"},
    "100111": {"id": 34, "char": "䷡", "name_cn": "大壯", "pinyin": "Dà Zhuàng"},
    "101000": {"id": 35, "char": "䷢", "name_cn": "晉", "pinyin": "Jìn"},
    "000101": {"id": 36, "char": "䷣", "name_cn": "明夷", "pinyin": "Míng Yí"},
    "110101": {"id": 37, "char": "䷤", "name_cn": "家人", "pinyin": "Jiā Rén"},
    "101011": {"id": 38, "char": "䷥", "name_cn": "睽", "pinyin": "Kuí"},
    "001010": {"id": 39, "char": "䷦", "name_cn": "蹇", "pinyin": "Jiǎn"},
    "010100": {"id": 40, "char": "䷧", "name_cn": "解", "pinyin": "Xiè"},
    "001011": {"id": 41, "char": "䷨", "name_cn": "損", "pinyin": "Sǔn"},
    "110100": {"id": 42, "char": "䷩", "name_cn": "益", "pinyin": "Yì"},
    "011111": {"id": 43, "char": "䷪", "name_cn": "夬", "pinyin": "Guài"},
    "111110": {"id": 44, "char": "䷫", "name_cn": "姤", "pinyin": "Gòu"},
    "011000": {"id": 45, "char": "䷬", "name_cn": "萃", "pinyin": "Cuì"},
    "000110": {"id": 46, "char": "䷭", "name_cn": "升", "pinyin": "Shēng"},
    "011010": {"id": 47, "char": "䷮", "name_cn": "困", "pinyin": "Kùn"},
    "010110": {"id": 48, "char": "䷯", "name_cn": "井", "pinyin": "Jǐng"},
    "011101": {"id": 49, "char": "䷰", "name_cn": "革", "pinyin": "Gé"},
    "101110": {"id": 50, "char": "䷱", "name_cn": "鼎", "pinyin": "Dǐng"},
    "100100": {"id": 51, "char": "䷲", "name_cn": "震", "pinyin": "Zhèn"},
    "001001": {"id": 52, "char": "䷳", "name_cn": "艮", "pinyin": "Gèn"},
    "110001": {"id": 53, "char": "䷴", "name_cn": "漸", "pinyin": "Jiàn"},
    "100011": {"id": 54, "char": "䷵", "name_cn": "歸妹", "pinyin": "Guī Mèi"},
    "100101": {"id": 55, "char": "䷶", "name_cn": "豐", "pinyin": "Fēng"},
    "101001": {"id": 56, "char": "䷷", "name_cn": "旅", "pinyin": "Lǚ"},
    "110110": {"id": 57, "char": "䷸", "name_cn": "巽", "pinyin": "Xùn"},
    "011011": {"id": 58, "char": "䷹", "name_cn": "兌", "pinyin": "Duì"},
    "110010": {"id": 59, "char": "䷺", "name_cn": "渙", "pinyin": "Huàn"},
    "010011": {"id": 60, "char": "䷻", "name_cn": "節", "pinyin": "Jié"},
    "110011": {"id": 61, "char": "䷼", "name_cn": "中孚", "pinyin": "Zhōng Fú"},
    "001100": {"id": 62, "char": "䷽", "name_cn": "小過", "pinyin": "Xiǎo Guò"},
    "010101": {"id": 63, "char": "䷾", "name_cn": "既濟", "pinyin": "Jì Jì"},
    "101010": {"id": 64, "char": "䷿", "name_cn": "未濟", "pinyin": "Wèi Jì"},
}

BASE_URL = "https://zh.wikisource.org/wiki/周易/"
OUTPUT_FILENAME = "gua_yao_ci.json"

def fetch_page(url):
    """获取指定URL的HTML内容"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15) # 增加超时时间
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"  [错误] 获取URL {url} 失败: {e}")
        return None

def parse_hexagram_page(html_content, hex_name_cn):
    """
    解析单个卦的HTML页面，提取卦辞和爻辞。
    此函数现在优先匹配用户提供的 <li><ul>...</ul><ol>...</ol></li> 结构。
    """
    if not html_content:
        return None

    soup = BeautifulSoup(html_content, 'html.parser')
    data = {"gua_ci": "", "yao_ci": []}

    content_div = soup.find('div', class_='mw-parser-output')
    if not content_div:
        print(f"  [警告] {hex_name_cn}: 未找到主要内容区域 'div.mw-parser-output'。")
        return None

    # 尝试根据用户提供的新结构解析
    # 结构: <li> <span>易经...</span> <ul><li><span><b>卦名</b>:卦辞</span></li></ul> <ol><li><span>爻辞</span></li>...</ol> </li>
    
    main_li_container_found = False
    
    # 1. 找到包含“卦名：卦辞”的 <span>
    #    这个 <span> 的父级是 <li>，祖父级是 <ul>，曾祖父级是主要的 <li> 容器
    
    # 查找所有<b>标签，看其内容是否为当前卦名
    all_b_tags = content_div.find_all('b')
    potential_gua_ci_span = None
    
    for b_tag in all_b_tags:
        if b_tag.text.strip() == hex_name_cn:
            # 检查其父span是否符合 "卦名：卦辞" 或 "卦名，卦辞" 格式
            parent_span = b_tag.find_parent('span')
            if parent_span:
                span_text = parent_span.text.strip()
                if span_text.startswith(hex_name_cn + "：") or \
                   span_text.startswith(hex_name_cn + "，"):
                    # 确认父级结构是否为 ul > li > span
                    parent_li_of_span = parent_span.find_parent('li')
                    if parent_li_of_span:
                        parent_ul_of_li = parent_li_of_span.find_parent('ul')
                        if parent_ul_of_li:
                            # 这个ul是包含卦辞的ul。它的父级li是主容器
                            main_li_container = parent_ul_of_li.find_parent('li')
                            if main_li_container:
                                # 检查此main_li_container是否也直接包含一个ol (爻辞列表)
                                # 并且 parent_ul_of_li 确实是 main_li_container 的子元素
                                if parent_ul_of_li in main_li_container.find_all('ul', recursive=False): # recursive=False 确保是直接子元素
                                    ol_for_yao_ci = main_li_container.find('ol', recursive=False)
                                    if ol_for_yao_ci:
                                        data["gua_ci"] = span_text
                                        
                                        yao_count = 0
                                        for li_tag_in_ol in ol_for_yao_ci.find_all('li', recursive=False):
                                            span_in_li = li_tag_in_ol.find('span')
                                            if span_in_li:
                                                p_text = span_in_li.text.strip()
                                                if not p_text: continue

                                                if hex_name_cn == "乾" and p_text.startswith("用九"):
                                                    data["yong_jiu"] = p_text
                                                elif hex_name_cn == "坤" and p_text.startswith("用六"):
                                                    data["yong_liu"] = p_text
                                                elif yao_count < 6:
                                                    # 简单判断是否为爻辞（实际应更精确）
                                                    prefixes = ["初九", "初六", "九二", "六二", "九三", "六三", "九四", "六四", "九五", "六五", "上九", "上六"]
                                                    is_actual_yao_ci = any(p_text.startswith(p) for p in prefixes)
                                                    if is_actual_yao_ci:
                                                        data["yao_ci"].append(p_text)
                                                        yao_count += 1
                                        
                                        if yao_count < 6:
                                            print(f"  [警告] {hex_name_cn} (新结构): 仅提取到 {yao_count} 条爻辞。")
                                        main_li_container_found = True
                                        break # 找到了符合结构的卦，跳出b_tag循环
    if main_li_container_found:
        # 确保爻辞列表长度为6
        while len(data["yao_ci"]) < 6:
            data["yao_ci"].append(f"（爻辞 {len(data['yao_ci'])+1} 未找到或解析不匹配）")
        data["yao_ci"] = data["yao_ci"][:6] # 确保正好6条
        return data

    # 如果新结构未找到或解析失败，打印提示并返回None（或可尝试旧的H2/P解析作为回退）
    print(f"  [信息] {hex_name_cn}: 未能按用户提供的新HTML结构找到完整信息。将尝试原始H2/P解析方法。")
    
    # --- 回退到原始的H2/P标签解析逻辑 ---
    jingwen_h2 = content_div.find("span", {"class": "mw-headline", "id": "經文"})
    if not jingwen_h2:
        jingwen_h2 = content_div.find("span", {"class": "mw-headline", "id": ".E7.B6.93.E6.96.87"}) # URL编码的"经文"
    
    if not jingwen_h2:
        print(f"  [警告] {hex_name_cn} (回退方法): 未找到“经文”标题。")
        return {"gua_ci": "（卦辞提取失败）", "yao_ci": ["（爻辞提取失败）"]*6}


    current_element = jingwen_h2.parent # h2标签

    p_after_h2 = current_element.find_next_sibling('p')
    if p_after_h2:
        b_tag_in_p = p_after_h2.find('b')
        if b_tag_in_p:
            data["gua_ci"] = b_tag_in_p.text.strip()
        else:
            full_text = p_after_h2.text.strip()
            # 尝试移除卦名（如果存在）
            if full_text.startswith(hex_name_cn + "：") or full_text.startswith(hex_name_cn + "，"):
                 data["gua_ci"] = full_text # 保留卦名和标点
            else:
                 data["gua_ci"] = full_text
        current_element = p_after_h2
    else:
        print(f"  [警告] {hex_name_cn} (回退方法): 未找到卦辞<p>标签。")
        data["gua_ci"] = "（卦辞提取失败）"


    yao_count = 0
    temp_el = current_element
    # 爻辞通常是连续的<p>标签
    while temp_el and yao_count < 7 : # 最多找7个p (6爻+用九/六)
        next_p = temp_el.find_next_sibling('p')
        if not next_p:
            break
        temp_el = next_p
        p_text = temp_el.text.strip()
        if not p_text: continue # 跳过空段落

        if hex_name_cn == "乾" and p_text.startswith("用九"):
            data["yong_jiu"] = p_text
        elif hex_name_cn == "坤" and p_text.startswith("用六"):
            data["yong_liu"] = p_text
        elif yao_count < 6:
            prefixes = ["初九", "初六", "九二", "六二", "九三", "六三", "九四", "六四", "九五", "六五", "上九", "上六"]
            is_actual_yao_ci = any(p_text.startswith(p) for p in prefixes)
            if is_actual_yao_ci:
                data["yao_ci"].append(p_text)
                yao_count += 1
    
    if yao_count < 6:
        print(f"  [警告] {hex_name_cn} (回退方法): 仅提取到 {yao_count} 条爻辞。")
    
    # 确保爻辞列表长度为6
    while len(data["yao_ci"]) < 6:
        data["yao_ci"].append(f"（爻辞 {len(data['yao_ci'])+1} 未找到或解析不匹配）")
    data["yao_ci"] = data["yao_ci"][:6] # 确保正好6条

    return data


def main():
    """主函数，遍历所有卦，爬取数据并保存到JSON文件"""
    all_hexagrams_data = {}
    total_hexagrams = len(HEXAGRAM_BASE_DATA)
    count = 0

    print(f"开始从维基文库爬取 {total_hexagrams} 卦的卦爻辞...")

    for binary_key, info in HEXAGRAM_BASE_DATA.items():
        count += 1
        hex_id = info['id']
        hex_name_cn = info['name_cn']
        
        print(f"\n({count}/{total_hexagrams}) 正在处理: {hex_id}. {hex_name_cn} ({binary_key})")
        
        url = f"{BASE_URL}{hex_name_cn}" # 确保卦名能正确用于URL
        print(f"  URL: {url}")
        
        html_content = fetch_page(url)
        if html_content:
            parsed_data = parse_hexagram_page(html_content, hex_name_cn)
            if parsed_data and parsed_data.get("gua_ci") != "（卦辞提取失败）": # 基本检查确保解析有所获
                all_hexagrams_data[binary_key] = {
                    "id": hex_id,
                    "name_cn": hex_name_cn,
                    "gua_ci": parsed_data.get("gua_ci", "（卦辞缺失）"),
                    "yao_ci": parsed_data.get("yao_ci", ["（爻辞缺失）"]*6),
                }
                if "yong_jiu" in parsed_data:
                    all_hexagrams_data[binary_key]["yong_jiu"] = parsed_data["yong_jiu"]
                if "yong_liu" in parsed_data:
                    all_hexagrams_data[binary_key]["yong_liu"] = parsed_data["yong_liu"]
                
                print(f"  成功处理: {hex_name_cn}")
            else:
                print(f"  未能有效解析: {hex_name_cn}")
                all_hexagrams_data[binary_key] = {
                    "id": hex_id, "name_cn": hex_name_cn, "gua_ci": "（提取失败或结构不符）", "yao_ci": ["（提取失败或结构不符）"]*6
                }
        else:
             all_hexagrams_data[binary_key] = {
                "id": hex_id, "name_cn": hex_name_cn, "gua_ci": "（获取页面失败）", "yao_ci": ["（获取页面失败）"]*6
            }

        time.sleep(random.uniform(0.8, 2.0)) # 调整延时

    print(f"\n所有卦处理完毕。")

    try:
        with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
            json.dump(all_hexagrams_data, f, ensure_ascii=False, indent=2)
        print(f"数据已成功保存到 {OUTPUT_FILENAME}")
    except IOError as e:
        print(f"保存文件 {OUTPUT_FILENAME} 失败: {e}")

if __name__ == "__main__":
    main()
